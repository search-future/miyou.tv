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
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from "react";
import Toast from "react-native-root-toast";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import qs from "querystring";
// @ts-ignore
import { ReactMPV } from "mpv.js";

import { RootState } from "../modules";
import { PlayerState, PlayerActions } from "../modules/player";
import { SettingState, SettingActions } from "../modules/setting";
import { ViewerActions, ViewerProgram } from "../modules/viewer";
import { WindowActions } from "../modules/window";
import { toastOptions } from "../config/constants";

type MPV = {
  command: (cmd: string, ...args: any[]) => void;
  property: (name: string, value: any) => void;
  observe: (name: string) => void;
};

type Setting = SettingState & {
  backend?: { type: string };
  player?: {
    mute?: boolean;
    volume?: string;
    speed?: string;
    deinterlace?: boolean;
    repeat?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const Player = memo(() => {
  const mpvRef = useRef<MPV>();
  const status = useRef({
    mute: false,
    volume: 100,
    speed: 1,
    pause: true,
    deinterlace: true,
    videoTrack: 0,
    audioTrack: 0,
    subtitleTrack: 0,
    dualMonoMode: "auto"
  });
  const observers = useRef<{ [name: string]: ((value: any) => void) | null }>({
    path: value => {
      path.current = value;
    },
    "file-format": value => {
      if (value === "hls,applehttp") {
        mpvRef.current?.property("framedrop", false);
      }
    },
    duration: null,
    "percent-pos": null,
    "time-pos": null,
    "eof-reached": null,
    "ao-volume": value => {
      status.current.volume = value;
    },
    "ao-mute": value => {
      status.current.mute = value;
    },
    "track-list/count": null,
    seekable: value => {
      seekable.current = value;
    },
    "playback-abort": null,
    vid: value => {
      status.current.videoTrack = value;
    },
    aid: value => {
      status.current.audioTrack = value;
    },
    sid: value => {
      status.current.subtitleTrack = value;
    },
    speed: value => {
      status.current.speed = value;
    },
    pause: value => {
      status.current.pause = value;
    },
    deinterlace: value => {
      status.current.deinterlace = value;
    }
  });
  const options = useRef<{ [key: string]: string }>({
    "ad-lavc-o": "dual_mono_mode=auto"
  });
  const startSeconds = useRef(0);
  const initializing = useRef(true);
  const preseek = useRef(0);
  const path = useRef("");
  const seekable = useRef(true);
  const pcrWraparound = useRef(true);
  const seekId = useRef<number | null>(null);

  const dispatch = useDispatch();
  const backendType = useSelector<State, string>(
    ({ setting }) => setting.backend?.type || "chinachu"
  );
  const commentDelay = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.delay || "0", 10)
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
  const expand = useSelector<State, boolean>(
    ({ setting }) => setting.viewer?.expand,
    shallowEqual
  );
  const pause = useSelector<State, boolean>(({ player }) => player.pause);
  const { time, position } = useSelector<State, PlayerState>(
    ({ player }) => player,
    (left, right) =>
      Math.floor(left.time / 1000) === Math.floor(right.time / 1000)
  );
  const duration = useSelector<State, number>(({ player }) => player.duration);
  const track = useSelector<State, { [key: string]: number }>(
    ({ player }) => player.track
  );
  const trackCount = useSelector<State, { [key: string]: number }>(
    ({ player }) => player.trackCount
  );
  const dualMonoMode = useSelector<State, string>(
    ({ player }) => player.dualMonoMode
  );
  const seekTime = useSelector<State, number | null>(
    ({ player: { seekTime } }) => seekTime
  );
  const seekPosition = useSelector<State, number | null>(
    ({ player: { seekPosition } }) => seekPosition
  );
  const programs = useSelector<State, ViewerProgram[]>(
    ({ viewer }) => viewer.programs,
    shallowEqual
  );
  const index = useSelector<State, number>(({ viewer }) => viewer.index);
  const extraIndex = useSelector<State, number>(
    ({ viewer }) => viewer.extraIndex
  );
  const peakPlay = useSelector<State, boolean>(({ viewer }) => viewer.peakPlay);
  const fullScreen = useSelector<State>(({ window }) => window.fullScreen);

  const [bootstrap, setBootstrap] = useState(false);

  const recordedProgram = useMemo(() => {
    return programs[index]?.recorded?.[extraIndex] || programs[index];
  }, [programs, index, extraIndex]);

  useEffect(() => {
    if (bootstrap) {
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

        let [uri, query] = recordedProgram.stream.split("?");
        const opts = [];
        for (const name in options.current) {
          opts.push(`${name}=${options.current[name]}`);
        }

        if (query) {
          uri += `?${query}`;
        }
        mpvRef.current?.command("loadfile", uri, "replace", opts.join(","));
        dispatch(PlayerActions.play());
      }
      setBootstrap(false);
    }
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
    observers.current.duration = value => {
      if (value > 10) {
        const duration = value * 1000;
        dispatch(PlayerActions.progress({ duration }));
      } else {
        const { duration } = recordedProgram;
        dispatch(PlayerActions.progress({ duration }));
      }
    };
  }, [recordedProgram]);
  useEffect(() => {
    observers.current["percent-pos"] = value => {
      if (seekable.current) {
        const position = value / 100;
        if (duration > 0) {
          dispatch(PlayerActions.progress({ position }));
        } else if (time > 0) {
          const duration = time / position;
          dispatch(PlayerActions.progress({ duration, position }));
        }
      }
    };
  }, [time, duration]);
  useEffect(() => {
    observers.current["time-pos"] = value => {
      let time = (value * 1000) % pcrFixer;
      pcrWraparound.current = value * 1000 > pcrFixer;
      if (pcrWraparound.current) {
        time %= pcrFixer;
      }
      if (seekable.current) {
        if (duration > 0) {
          dispatch(PlayerActions.progress({ time }));
        } else if (position > 0) {
          const duration = time / position;
          dispatch(PlayerActions.progress({ duration, time }));
        }
      } else if (seekId.current == null) {
        time += startSeconds.current * 1000;
        const position = time / duration;
        dispatch(PlayerActions.progress({ time, position }));
      }

      if (preseek.current > 0) {
        dispatch(PlayerActions.time(preseek.current));
        preseek.current = 0;
      }
    };
  }, [position, duration]);
  useEffect(() => {
    const onStopped = () => {
      switch (repeat) {
        case "continue": {
          initializing.current = true;
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
          initializing.current = true;
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
          break;
        }
        default:
          dispatch(ViewerActions.update({ playing: false }));
      }
    };
    observers.current["eof-reached"] = value => {
      if (value) {
        onStopped();
      }
    };
    observers.current["playback-abort"] = value => {
      if (value) {
        Toast.show("Playback was aborted.", {
          ...toastOptions,
          duration: Toast.durations.LONG
        });
        onStopped();
      }
    };
  }, [repeat, programs, index, extraIndex]);
  useEffect(() => {
    observers.current["track-list/count"] = count => {
      dispatch(
        PlayerActions.trackCount({
          video: 0,
          audio: 0,
          subtitle: 0
        })
      );
      for (let i = 0; i < count; i++) {
        const name = `track-list/${i}/type`;
        if (!observers.current[name]) {
          mpvRef.current?.observe(name);
        }
        observers.current[name] = type => {
          if (trackCount[type] != null) {
            trackCount[type]++;
            track[type] = 1;
          } else {
            trackCount[type] = 1;
          }
          dispatch(PlayerActions.trackCount(trackCount));
          dispatch(PlayerActions.track(track));
        };
      }
    };
  }, [track, trackCount]);
  useEffect(() => {
    if (mute !== status.current.mute) {
      mpvRef.current?.property("ao-mute", mute);
    }
    if (volume !== status.current.volume) {
      mpvRef.current?.property("ao-volume", volume);
    }
    if (
      trackCount.video > 0 &&
      track.video !== status.current.videoTrack &&
      (status.current.videoTrack > 0 || track.video > 0)
    ) {
      mpvRef.current?.property("vid", track.video);
    }
    if (
      trackCount.audio > 0 &&
      track.audio !== status.current.audioTrack &&
      (status.current.audioTrack > 0 || track.audio > 0)
    ) {
      mpvRef.current?.property("aid", track.audio);
    }
    if (
      trackCount.subtitle > 0 &&
      track.subtitle !== status.current.subtitleTrack &&
      (status.current.subtitleTrack > 0 || track.subtitle > 0)
    ) {
      mpvRef.current?.property("sid", track.subtitle);
    }
    if (speed.toFixed(1) !== status.current.speed.toFixed(1)) {
      mpvRef.current?.property("speed", speed);
    }
    if (pause !== status.current.pause) {
      mpvRef.current?.property("pause", pause);
    }
    if (deinterlace !== status.current.deinterlace) {
      mpvRef.current?.property("deinterlace", deinterlace);
    }
    if (dualMonoMode !== status.current.dualMonoMode) {
      if (mpvRef.current) {
        options.current["ad-lavc-o"] = `dual_mono_mode=${dualMonoMode}`;
        const opts = [`start=${time / 1000}`];
        for (const name in options.current) {
          opts.push(`${name}=${options.current[name]}`);
        }
        mpvRef.current.command(
          "loadfile",
          path.current,
          "replace",
          opts.join(",")
        );
      }
      status.current.dualMonoMode = dualMonoMode;
    }
  });
  useEffect(() => {
    if (seekTime != null) {
      if (seekable.current) {
        if (pcrWraparound.current) {
          dispatch(PlayerActions.position(seekTime / duration));
        } else {
          mpvRef.current?.property("time-pos", seekTime / 1000);
        }
      } else {
        const position = seekTime / duration;
        if (backendType === "chinachu" || backendType === "epgstation") {
          if (seekId.current != null) {
            clearTimeout(seekId.current);
          }
          dispatch(PlayerActions.progress({ time: seekTime, position }));

          const ss = Math.floor(seekTime / 1000);
          const [uri, query] = path.current.split("?");
          const opts = [];
          for (const name in options.current) {
            opts.push(`${name}=${options.current[name]}`);
          }

          const commandUrl = `${uri}?${qs.stringify({
            ...qs.parse(query),
            ss
          })}`;
          const commandOptions = opts.join(",");
          seekId.current = setTimeout(() => {
            mpvRef.current?.command(
              "loadfile",
              commandUrl,
              "replace",
              commandOptions
            );
            startSeconds.current = ss;
            seekId.current = null;
            dispatch(PlayerActions.play());
          }, 500);
        }
      }
    }
  }, [seekTime]);
  useEffect(() => {
    if (seekPosition != null) {
      if (
        seekable.current &&
        backendType !== "garapon" &&
        backendType !== "garaponv4"
      ) {
        mpvRef.current?.property("percent-pos", Math.floor(seekPosition * 100));
      } else {
        dispatch(PlayerActions.time(seekPosition * duration));
      }
    }
  }, [seekPosition]);
  useEffect(() => {
    const keys: (string | string[])[] = [];
    keys.push("s");
    Mousetrap.bind("s", () => {
      dispatch(ViewerActions.update({ playing: false }));
    });
    keys.push("=");
    Mousetrap.bind("=", () => {
      dispatch(SettingActions.update("player", { speed: "1" }));
    });
    return () => {
      for (const key of keys) {
        Mousetrap.unbind(key);
      }
    };
  }, []);
  useEffect(() => {
    const key = ["+", "pageup"];
    Mousetrap.bind(key, () => {
      let value = speed + 0.1;
      if (value > 8) {
        value = 8;
      }
      dispatch(SettingActions.update("player", { speed: value.toFixed(1) }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [speed]);
  useEffect(() => {
    const key = ["-", "pagedown"];
    Mousetrap.bind(key, () => {
      let value = speed - 0.1;
      if (value <= 0) {
        value = 0.1;
      }
      dispatch(SettingActions.update("player", { speed: value.toFixed(1) }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [speed]);
  useEffect(() => {
    const key = "b";
    Mousetrap.bind(key, () => {
      const audiotrack = track.audio + 1;
      if (audiotrack <= trackCount.audio) {
        dispatch(PlayerActions.track({ audio: audiotrack }));
      } else {
        dispatch(PlayerActions.track({ audio: 1 }));
      }
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [track, trackCount]);
  useEffect(() => {
    const key = "m";
    Mousetrap.bind(key, () => {
      dispatch(SettingActions.update("player", { mute: !mute }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [mute]);
  useEffect(() => {
    const key = "p";
    Mousetrap.bind(key, () => {
      const program = programs[index];
      const prevExtraIndex = extraIndex - 1;
      const prevIndex = index - 1;
      if (program.recorded?.[prevExtraIndex]) {
        dispatch(
          ViewerActions.update({
            extraIndex: prevExtraIndex,
            peakPlay: false
          })
        );
      } else if (programs[prevIndex]) {
        dispatch(
          ViewerActions.update({
            index: prevIndex,
            extraIndex: 0,
            peakPlay: false
          })
        );
      }
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [programs, index, extraIndex]);
  useEffect(() => {
    const key = "n";
    Mousetrap.bind(key, () => {
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
      }
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [programs, index, extraIndex]);
  useEffect(() => {
    const key = "f";
    Mousetrap.bind(key, () => {
      dispatch(WindowActions.setFullScreen(!fullScreen));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [fullScreen]);
  useEffect(() => {
    const key = ["up", "mod+up"];
    Mousetrap.bind(key, () => {
      let value = volume + 5;
      if (value > 100) {
        value = 100;
      }
      dispatch(SettingActions.update("player", { volume: value }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [volume]);
  useEffect(() => {
    const key = ["down", "mod+down"];
    Mousetrap.bind(key, () => {
      let newVolume = volume - 5;
      if (newVolume < 0) {
        newVolume = 0;
      }
      dispatch(SettingActions.update("player", { volume: newVolume }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [volume]);
  useEffect(() => {
    const key = ["left", "mod+left"];
    Mousetrap.bind(key, () => {
      dispatch(PlayerActions.time(time - 10000));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [time]);
  useEffect(() => {
    const key = ["right", "mod+right"];
    Mousetrap.bind(key, () => {
      dispatch(PlayerActions.time(time + 30000));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [time]);
  useEffect(() => {
    const key = ["right", "mod+right"];
    Mousetrap.bind(key, () => {
      dispatch(PlayerActions.time(time + 30000));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [time]);
  useEffect(() => {
    const key = ["shift+left", "["];
    Mousetrap.bind(key, () => {
      const delay = commentDelay - 500;
      dispatch(SettingActions.update("commentPlayer", { delay }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [commentDelay]);
  useEffect(() => {
    const key = ["shift+right", "]"];
    Mousetrap.bind(key, () => {
      const delay = commentDelay + 500;
      dispatch(SettingActions.update("commentPlayer", { delay }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [commentDelay]);
  useEffect(() => {
    const key = ["o", "mod+s"];
    Mousetrap.bind(key, () => {
      dispatch(SettingActions.update("viewer", { expand: !expand }));
    });
    return () => {
      Mousetrap.unbind(key);
    };
  }, [expand]);

  const onReady = useCallback((mpv: MPV) => {
    mpvRef.current = mpv;
    if (mpvRef.current) {
      for (const name in observers.current) {
        mpvRef.current?.observe(name);
      }
      mpvRef.current?.property("cursor-autohide", true);
      setBootstrap(true);
    }
  }, []);
  const onPropertyChange = useCallback((name: string, value: any) => {
    const observer = observers.current[name];
    if (observer) {
      observer(value);
    }
  }, []);

  return <ReactMPV onReady={onReady} onPropertyChange={onPropertyChange} />;
});
export default Player;

const pcrFixer = 2 ** 33 / 90;
