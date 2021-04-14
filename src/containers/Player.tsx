/*!
Copyright 2016-2021 Brazil Ltd.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo
} from "react";
import { StatusBar, Platform, StyleSheet } from "react-native";
import Video, { OnProgressData } from "react-native-video";
import KeepAwake from "react-native-keep-awake";
import Toast from "react-native-root-toast";
import { useDispatch, useSelector } from "react-redux";
import qs from "qs";
// @ts-ignore
import { VLCPlayer } from "react-native-vlc-media-player";
// @ts-ignore
import { Immersive } from "react-native-immersive";

import { RootState } from "../modules";
import { LoadingActions } from "../modules/loading";
import { PlayerActions } from "../modules/player";
import { SettingState } from "../modules/setting";
import { ViewerActions, ViewerProgram } from "../modules/viewer";
import { toastOptions } from "../config/constants";

type Setting = SettingState & {
  backend?: {
    type?: string;
    mobileStreamType?: string;
    mobileStreamParams?: string;
  };
  player?: {
    mute?: boolean;
    volume?: string;
    speed?: string;
    repeat?: string;
  };
};
type State = RootState & {
  setting: Setting;
};
const Player = () => {
  const videoRef = useRef<Video>(null);
  const vlcRef = useRef<VLCPlayer>(null);
  const preseek = useRef(0);
  const seekable = useRef(true);
  const seekId = useRef<number | null>(null);
  const initializing = useRef(true);
  const retryCount = useRef(0);

  const dispatch = useDispatch();
  const type = useSelector<State, string>(
    ({ setting }) => setting.backend?.type || "chinachu"
  );
  const mobileStreamType = useSelector<State, string>(
    ({ setting }) => setting.backend?.mobileStreamType || "mp4"
  );
  const mobileStreamParams = useSelector<State, string>(
    ({ setting }) => setting.backend?.mobileStreamParams || ""
  );
  const mute = useSelector<State, boolean>(
    ({ setting }) => setting.player?.mute
  );
  const volume = useSelector<State, number>(({ setting }) =>
    parseInt(
      setting.player?.volume != null ? setting.player?.volume : "100",
      10
    )
  );
  const speed = useSelector<State, number>(({ setting }) =>
    parseFloat(setting.player?.speed || "1")
  );
  const deinterlace = useSelector<State, boolean>(
    ({ setting }) =>
      setting.player?.deinterlace == null || setting.player?.deinterlace
  );
  const repeat = useSelector<State, string>(
    ({ setting }) => setting.player?.repeat || "continue"
  );
  const networkType = useSelector<State, string>(({ network }) => network.type);
  const pause = useSelector<State, boolean>(({ player }) => player.pause);
  const duration = useSelector<State, number>(({ player }) => player.duration);
  const time = useSelector<State, number>(({ player }) => player.time);
  const audioTrack = useSelector<State, number>(
    ({ player }) => player.track.audio || 0
  );
  const dualMonoMode = useSelector<State, string>(
    ({ player }) => player.dualMonoMode
  );
  const seekTime = useSelector<State, number>(({ player }) => player.seekTime);
  const seekPosition = useSelector<State, number>(
    ({ player }) => player.seekPosition
  );
  const programs = useSelector<State, ViewerProgram[]>(
    ({ viewer }) => viewer.programs
  );
  const index = useSelector<State, number>(({ viewer }) => viewer.index);
  const extraIndex = useSelector<State, number>(
    ({ viewer: { extraIndex } }) => extraIndex
  );
  const peakPlay = useSelector<State, boolean>(({ viewer }) => viewer.peakPlay);

  const [bootstrap, setBootstrap] = useState(false);
  const [reset, setReset] = useState(false);
  const [ss, setStartSeconds] = useState(0);

  const recordedProgram = useMemo(
    () => programs[index].recorded?.[extraIndex] || programs[index],
    [programs, index, extraIndex]
  );
  const uri = useMemo(() => {
    let [uri, query] = recordedProgram.stream.split("?");
    if (recordedProgram.type !== "file" && networkType.indexOf("cell") >= 0) {
      switch (type) {
        case "chinachu": {
          uri = uri.replace(/[^.]+$/, mobileStreamType);
          query = mobileStreamParams;
          break;
        }
        case "epgstation": {
          const [, path, id] =
            uri.match(/(\/api\/recorded\/([0-9]+)\/file)$/) ||
            uri.match(/(\/api\/videos\/([0-9]+))$/) ||
            [];
          if (id) {
            if (mobileStreamType !== "raw") {
              uri = uri.replace(
                /\/api\/.+$/,
                `/api/streams/recorded/${id}/${mobileStreamType}`
              );
              query = qs.stringify({
                mode: 0,
                ss: 0,
                ...qs.parse(query),
                ...qs.parse(mobileStreamParams)
              });
            } else if (
              recordedProgram.download?.find(
                ({ uri }) => uri.indexOf(path) >= 0
              )?.name === "TS"
            ) {
              uri = uri.replace(
                /\/api\/.+$/,
                `/api/streams/recorded/${id}/mp4`
              );
              query = "mode=0&ss=0";
            }
          } else {
            uri = uri.replace(/[^/]+$/, mobileStreamType);
            query = qs.stringify({
              mode: 0,
              ss: 0,
              ...qs.parse(query),
              ...qs.parse(mobileStreamParams)
            });
          }
          break;
        }
        default:
      }
    }
    if (ss > 0) {
      query = `${qs.stringify({ ...qs.parse(query), ss })}`;
    }
    if (query) {
      uri += `?${query}`;
    }

    return uri;
  }, [mobileStreamType, mobileStreamParams, recordedProgram, networkType, ss]);
  const initOptions = useMemo(() => {
    const options = [
      "--file-caching=5000",
      "--live-caching=10000",
      "--network-caching=10000"
    ];
    if (deinterlace) {
      options.push("--deinterlace=1", "--deinterlace-mode=discard");
    } else {
      options.push("--deinterlace=0");
    }
    switch (dualMonoMode) {
      case "both":
        options.push("--stereo-mode=1");
        break;
      case "main":
        options.push("--stereo-mode=3");
        break;
      case "sub":
        options.push("--stereo-mode=4");
        break;
    }
    if (audioTrack > 0) {
      options.push(`--audio-track=${audioTrack}`);
    }

    return options;
  }, [deinterlace, audioTrack, dualMonoMode]);
  const stereoPan = useMemo(() => {
    switch (dualMonoMode) {
      case "main":
        return -1;
      case "sub":
        return 1;
    }
    return 0;
  }, [dualMonoMode]);

  useEffect(() => {
    if (Platform.OS === "android") {
      Immersive.on();
      StatusBar.setHidden(true);
    }
    KeepAwake.activate();
  });
  useEffect(
    () => () => {
      if (Platform.OS === "android") {
        Immersive.off();
        StatusBar.setHidden(false);
      }
      KeepAwake.deactivate();
    },
    []
  );
  useEffect(() => {
    if (bootstrap) {
      KeepAwake.activate();
      const program = programs[index];
      if (program && recordedProgram) {
        if (peakPlay && program.commentMaxSpeedTime) {
          preseek.current =
            new Date(program.commentMaxSpeedTime).getTime() -
            new Date(recordedProgram.start).getTime();
        } else {
          preseek.current =
            new Date(program.start).getTime() -
            new Date(recordedProgram.start).getTime();
        }
        setStartSeconds(0);
        dispatch(PlayerActions.position(0));
      }
    }
    setBootstrap(false);
  }, [bootstrap]);
  useEffect(() => {
    if (pause && !initializing.current) {
      dispatch(ViewerActions.update({ playing: false }));
    } else if (!bootstrap) {
      initializing.current = false;
      if (seekId.current != null) {
        clearTimeout(seekId.current);
      }
      dispatch(PlayerActions.progress({ duration: 0, time: 0, position: 0 }));
      setBootstrap(true);
    }
  }, [programs, index, extraIndex]);
  useEffect(() => {
    if (reset) {
      setReset(false);
      if (time > 0) {
        preseek.current = time
      }
    }
  }, [reset]);
  useEffect(() => {
    setReset(true);
  }, [uri]);
  useEffect(() => {
    if (vlcRef.current) {
      setReset(true);
    }
  }, [initOptions]);
  useEffect(() => {
    if (recordedProgram.type !== "file") {
      switch (type) {
        case "chinachu": {
          let [baseUri, query] = uri.split("?");
          seekable.current =
            /[^.]\.m2ts+$/.test(baseUri) && query === "c:v=copy&c:a=copy";
          break;
        }
        case "epgstation": {
          let [baseUri, query] = uri.split("?");
          seekable.current =
            /\/api\/recorded\/[0-9]+\/file$/.test(baseUri) ||
            /\/api\/videos\/[0-9]+$/.test(baseUri);
          break;
        }
        case "mirakc": {
          seekable.current = true;
          break;
        }
        default:
          seekable.current = false;
      }
    }
  }, [uri, recordedProgram.type]);
  useEffect(() => {
    if (seekTime != null) {
      if (seekable.current) {
        if (vlcRef.current) {
          dispatch(PlayerActions.position(seekTime / duration));
        } else {
          videoRef.current?.seek(Math.floor(seekTime / 1000));
        }
      } else {
        const position = seekTime / duration;
        if (seekId.current != null) {
          clearTimeout(seekId.current);
        }
        dispatch(
          PlayerActions.progress({ duration, time: seekTime, position })
        );

        const ss = Math.floor(seekTime / 1000);
        seekId.current = setTimeout(() => {
          retryCount.current = 0;
          setStartSeconds(ss);
          seekId.current = null;
        }, 500);
      }
    }
  }, [seekTime]);
  useEffect(() => {
    if (seekPosition != null) {
      if (vlcRef.current && seekable.current) {
        vlcRef.current.seek(seekPosition);
      } else {
        dispatch(PlayerActions.time(seekPosition * duration));
      }
    }
  }, [seekPosition]);

  const onLoadStart = useCallback(() => {
    dispatch(LoadingActions.start());
    dispatch(PlayerActions.play());
  }, []);
  const onVlcProgress = useCallback(
    ({
      currentTime = 0,
      duration = 0
    }: {
      currentTime: number;
      duration: number;
    }) => {
      if (seekId.current == null) {
        if (duration > 0) {
          seekable.current = true;
          dispatch(
            PlayerActions.progress({
              duration,
              time: currentTime,
              position: currentTime / duration
            })
          );
        } else {
          const { duration } = recordedProgram;
          const time = currentTime + ss * 1000;
          dispatch(
            PlayerActions.progress({
              duration,
              time,
              position: duration > 0 ? time / duration : 0
            })
          );
        }
      }
      if (preseek.current > 0) {
        dispatch(PlayerActions.time(preseek.current));
        preseek.current = 0;
      }
      dispatch(LoadingActions.complete());
    },
    [recordedProgram, ss]
  );
  const onVideoProgress = useCallback(
    ({ currentTime, seekableDuration }: OnProgressData) => {
      seekable.current = true;
      dispatch(
        PlayerActions.progress({
          duration: seekableDuration * 1000,
          time: currentTime * 1000,
          position: currentTime / seekableDuration
        })
      );
      if (preseek.current > 0) {
        dispatch(PlayerActions.time(preseek.current));
        preseek.current = 0;
      }
      dispatch(LoadingActions.complete());
    },
    []
  );
  const onEnd = useCallback(() => {
    retryCount.current = 0;
    dispatch(LoadingActions.complete());
    switch (repeat) {
      case "continue": {
        const program = programs[index];
        const nextExtraIndex = extraIndex + 1;
        const nextIndex = index + 1;
        if (program.recorded?.[nextExtraIndex]) {
          dispatch(
            ViewerActions.update({
              extraIndex: nextExtraIndex,
              peakPlay: false
            })
          );
        } else if (programs[nextIndex]) {
          dispatch(
            ViewerActions.update({
              index: nextIndex,
              extraIndex: 0,
              peakPlay: false
            })
          );
        } else {
          dispatch(ViewerActions.update({ playing: false }));
        }
        break;
      }
      case "repeat": {
        const program = programs[index];
        const nextExtraIndex = extraIndex + 1;
        if (program.recorded?.[nextExtraIndex]) {
          dispatch(
            ViewerActions.update({
              extraIndex: nextExtraIndex,
              peakPlay: false
            })
          );
        } else {
          dispatch(ViewerActions.update({ extraIndex: 0, peakPlay: false }));
        }
        setBootstrap(true);
        break;
      }
      default:
        dispatch(ViewerActions.update({ playing: false }));
    }
  }, [repeat, programs, index, extraIndex]);
  const onError = useCallback(() => {
    if (retryCount.current > 5) {
      Toast.show("Playback error", {
        ...toastOptions,
        duration: Toast.durations.LONG
      });
      onEnd();
    } else {
      retryCount.current++;
      setReset(true);
    }
  }, [onEnd]);

  if (bootstrap || reset) {
    return null;
  }

  if (
    type === "chinachu" ||
    type === "epgstation" ||
    type === "mirakc" ||
    recordedProgram.type === "file"
  ) {
    return (
      <VLCPlayer
        style={styles.video}
        paused={pause}
        muted={mute}
        volume={volume}
        source={{
          uri,
          initType: 0,
          initOptions: [...initOptions]
        }}
        rate={speed}
        ref={vlcRef}
        onLoadStart={onLoadStart}
        onProgress={onVlcProgress}
        onError={onError}
        onEnd={onEnd}
      />
    );
  }
  return (
    <Video
      style={styles.video}
      resizeMode="contain"
      paused={pause}
      rate={speed}
      muted={mute}
      volume={volume / 100}
      source={{ uri, type: "m3u8" } as any}
      selectedAudioTrack={{ type: "index", value: audioTrack }}
      stereoPan={stereoPan}
      ref={videoRef}
      onLoadStart={onLoadStart}
      onProgress={onVideoProgress}
      onEnd={onEnd}
    />
  );
};
export default Player;

const styles = StyleSheet.create({
  video: {
    flex: 1
  }
});
