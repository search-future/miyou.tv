/*!
Copyright 2016-2019 Brazil Ltd.
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
import { VLCPlayer } from "react-native-vlcplayer2";
// @ts-ignore
import { Immersive } from "react-native-immersive";

import { RootState } from "../modules";
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

  const dispatch = useDispatch();
  const type = useSelector<State, string>(
    ({ setting }) => setting.backend?.type || "chinachu"
  );
  const mobileStreamType = useSelector<State, string>(
    ({ setting }) => setting.backend?.mobileStreamType || "mp4"
  );
  const mobileStreamParams = useSelector<State, string>(
    ({ setting }) =>
      setting.backend?.mobileStreamParams || "b:v=1M&b:a=128k&s=1280x720"
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
  const repeat = useSelector<State, string>(
    ({ setting }) => setting.player?.repeat || "continue"
  );
  const networkType = useSelector<State, string>(({ network }) => network.type);
  const pause = useSelector<State, boolean>(({ player }) => player.pause);
  const duration = useSelector<State, number>(({ player }) => player.duration);
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
  const [ss, setStartSeconds] = useState(0);

  const recordedProgram = useMemo(
    () => programs[index].recorded?.[extraIndex] || programs[index],
    [programs, index, extraIndex]
  );
  const uri = useMemo(() => {
    let [uri, query] = recordedProgram.stream.split("?");
    if (recordedProgram.type !== "file") {
      if (
        networkType.indexOf("cell") >= 0 &&
        (type === "chinachu" || type === "epgstation")
      ) {
        uri = uri.replace(/[^.]+$/, mobileStreamType);
        query = mobileStreamParams;
      }
      if (type === "chinachu") {
        uri = uri.replace(/m2ts$/, "mp4");
      }
    }
    if (query || ss > 0) {
      uri += `?${qs.stringify({ ...qs.parse(query), ss })}`;
    }
    return uri;
  }, [mobileStreamType, mobileStreamParams, recordedProgram, networkType, ss]);

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
        dispatch(
          PlayerActions.progress({
            duration: 0,
            time: 0,
            position: 0
          })
        );
      }
    }
    setBootstrap(false);
  }, [bootstrap]);
  useEffect(() => {
    if (pause && !initializing.current) {
      dispatch(ViewerActions.update({ playing: false }));
    } else {
      initializing.current = false;
      setBootstrap(true);
    }
  }, [programs, index, extraIndex]);
  useEffect(() => {
    if (seekTime != null) {
      if (seekable.current) {
        vlcRef.current?.seek(Math.floor(seekTime / 1000));
        videoRef.current?.seek(Math.floor(seekTime / 1000));
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
          setStartSeconds(ss);
          dispatch(PlayerActions.play());
          seekId.current = null;
        }, 500);
      }
    }
  }, [seekTime]);
  useEffect(() => {
    if (seekPosition != null) {
      dispatch(PlayerActions.time(seekPosition * duration));
    }
  }, [seekPosition]);

  const onVlcOpen = useCallback(() => {
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
          seekable.current = false;
          dispatch(
            PlayerActions.progress({
              duration,
              time,
              position: time / duration
            })
          );
        }
      }
      if (preseek.current > 0) {
        dispatch(PlayerActions.time(preseek.current));
        preseek.current = 0;
      }
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
    },
    []
  );
  const onEnd = useCallback(() => {
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
    Toast.show("Playback error", {
      ...toastOptions,
      duration: Toast.durations.LONG
    });
    onEnd();
  }, [onEnd]);

  if (bootstrap) {
    return null;
  }

  if (
    type === "chinachu" ||
    type === "epgstation" ||
    recordedProgram.type === "file"
  ) {
    return (
      <VLCPlayer
        style={styles.video}
        paused={pause}
        muted={mute}
        volume={volume}
        initOptions={["--deinterlace=1", "--deinterlace-mode=discard"]}
        source={{ uri }}
        rate={speed}
        ref={vlcRef}
        onOpen={onVlcOpen}
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
      ref={videoRef}
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
