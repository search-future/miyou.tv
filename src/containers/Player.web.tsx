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

import React, { Component } from "react";
import Toast from "react-native-root-toast";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import qs from "querystring";
// @ts-ignore
import { ReactMPV } from "mpv.js";

import { PlayerState, PlayerActions } from "../modules/player";
import { SettingState, SettingActions } from "../modules/setting";
import { ViewerState, ViewerActions } from "../modules/viewer";
import { WindowActions, WindowState } from "../modules/window";
import { toastOptions } from "../config/constants";

type MPV = {
  command: (cmd: string, ...args: any[]) => void;
  property: (name: string, value: any) => void;
  observe: (name: string) => void;
};

type Props = {
  dispatch: Dispatch;
  player: PlayerState;
  setting: SettingState & {
    player?: {
      mute?: boolean;
      volume?: string;
      speed?: string;
      deinterlace?: boolean;
      repeat?: string;
    };
  };
  viewer: ViewerState;
  window: WindowState;
};
class Player extends Component<Props> {
  mpv?: MPV;
  bindKeys: (string | string[])[] = [];
  options: { [key: string]: string } = {
    "ad-lavc-o": "dual_mono_mode=auto"
  };
  observers: { [name: string]: (value: any) => void } = {};
  continuing = false;
  stopped = true;
  preseek = 0;
  ss = 0;
  path = "";
  mute = false;
  volume = 100;
  speed = 1;
  pause = false;
  deinterlace = true;
  videoTrack = 0;
  audioTrack = 0;
  subtitleTrack = 0;
  seekable = true;
  dualMonoMode = "auto";
  pcrWraparound = true;

  render() {
    return (
      <ReactMPV
        onReady={(mpv: MPV) => {
          this.mpv = mpv;

          const { viewer } = this.props;
          this.init();
          this.load(viewer.peakPlay);
        }}
        onPropertyChange={(name: string, value: any) => {
          const observer = this.observers[name];
          if (observer) {
            observer(value);
          }
        }}
      />
    );
  }

  componentDidMount() {
    this.bindKeys.push("s");
    Mousetrap.bind("s", () => {
      const { dispatch } = this.props;
      dispatch(ViewerActions.update({ playing: false }));
    });
    this.bindKeys.push("=");
    Mousetrap.bind("=", () => {
      const { dispatch } = this.props;
      dispatch(SettingActions.update("player", { speed: "1" }));
    });
    this.bindKeys.push(["+", "pageup"]);
    Mousetrap.bind(["+", "pageup"], () => {
      const { dispatch, setting } = this.props;
      const { player = {} } = setting;
      const { speed = "1" } = player;
      const newSpeed = parseFloat(speed) + 0.1;
      dispatch(SettingActions.update("player", { speed: newSpeed.toFixed(1) }));
    });
    this.bindKeys.push(["-", "pagedown"]);
    Mousetrap.bind(["-", "pagedown"], () => {
      const { dispatch, setting } = this.props;
      const { player = {} } = setting;
      const { speed = "1" } = player;
      const newSpeed = parseFloat(speed) - 0.1;
      dispatch(SettingActions.update("player", { speed: newSpeed.toFixed(1) }));
    });
    this.bindKeys.push("b");
    Mousetrap.bind("b", () => {
      const { dispatch, player } = this.props;
      const { track, trackCount } = player;
      const audiotrack = track.audio + 1;
      if (audiotrack <= trackCount.audio) {
        dispatch(PlayerActions.track({ audio: audiotrack }));
      } else {
        dispatch(PlayerActions.track({ audio: 1 }));
      }
    });
    this.bindKeys.push("m");
    Mousetrap.bind("m", () => {
      const { dispatch, setting } = this.props;
      const { player = {} } = setting;
      const { mute = false } = player;
      dispatch(SettingActions.update("player", { mute: !mute }));
    });
    this.bindKeys.push("p");
    Mousetrap.bind("p", () => {
      const { dispatch, viewer } = this.props;
      const { programs, index, extraIndex } = viewer;
      const program = programs[index];
      const prevExtraIndex = extraIndex - 1;
      const prevIndex = index - 1;
      if (program.recorded && program.recorded[prevExtraIndex]) {
        dispatch(
          ViewerActions.update({ extraIndex: prevExtraIndex, peakPlay: false })
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
    this.bindKeys.push("n");
    Mousetrap.bind("n", () => {
      const { dispatch, viewer } = this.props;
      const { programs, index, extraIndex } = viewer;
      const program = programs[index];
      const nextExtraIndex = extraIndex + 1;
      const nextIndex = index + 1;
      if (program.recorded && program.recorded[nextExtraIndex]) {
        dispatch(
          ViewerActions.update({ extraIndex: nextExtraIndex, peakPlay: false })
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
    this.bindKeys.push("f");
    Mousetrap.bind("f", () => {
      const { dispatch, window } = this.props;
      const { fullScreen } = window;
      dispatch(WindowActions.setFullScreen(!fullScreen));
    });
    this.bindKeys.push(["up", "mod+up"]);
    Mousetrap.bind(["up", "mod+up"], () => {
      const { dispatch, setting } = this.props;
      const { player = {} } = setting;
      const { volume = "100" } = player;
      let newVolume = parseInt(volume, 10) + 5;
      if (newVolume > 100) {
        newVolume = 100;
      }
      dispatch(SettingActions.update("player", { volume: newVolume }));
    });
    this.bindKeys.push(["down", "mod+down"]);
    Mousetrap.bind(["down", "mod+down"], () => {
      const { dispatch, setting } = this.props;
      const { player = {} } = setting;
      const { volume = "100" } = player;
      let newVolume = parseInt(volume, 10) - 5;
      if (newVolume < 0) {
        newVolume = 0;
      }
      dispatch(SettingActions.update("player", { volume: newVolume }));
    });
    this.bindKeys.push(["left", "mod+left"]);
    Mousetrap.bind(["left", "mod+left"], () => {
      const { dispatch, player } = this.props;
      const { time } = player;
      dispatch(PlayerActions.time(time - 10000));
    });
    this.bindKeys.push(["right", "mod+right"]);
    Mousetrap.bind(["right", "mod+right"], () => {
      const { dispatch, player } = this.props;
      const { time } = player;
      dispatch(PlayerActions.time(time + 30000));
    });
    this.bindKeys.push(["shift+left", "["]);
    Mousetrap.bind(["shift+left", "["], () => {
      const { dispatch, setting } = this.props;
      const { commentPlayer = {} } = setting;
      const delay = parseInt(commentPlayer.delay || "0", 10) - 500;
      dispatch(SettingActions.update("commentPlayer", { delay }));
    });
    this.bindKeys.push(["shift+right", "]"]);
    Mousetrap.bind(["shift+right", "]"], () => {
      const { dispatch, setting } = this.props;
      const { commentPlayer = {} } = setting;
      const delay = parseInt(commentPlayer.delay || "0", 10) + 500;
      dispatch(SettingActions.update("commentPlayer", { delay }));
    });
    this.bindKeys.push(["o", "mod+s"]);
    Mousetrap.bind(["o", "mod+s"], () => {
      const { dispatch, setting } = this.props;
      const { viewer = {} } = setting;
      const { expand = false } = viewer;
      dispatch(SettingActions.update("viewer", { expand: !expand }));
    });
  }

  shouldComponentUpdate(nextProps: Props) {
    const { player } = this.props;
    return (
      nextProps.player === player ||
      (nextProps.player.time === player.time &&
        nextProps.player.position === player.position)
    );
  }

  componentDidUpdate(prevProps: Props) {
    const { player, setting, viewer } = this.props;
    const {
      seekTime,
      seekPosition,
      pause,
      track,
      trackCount,
      dualMonoMode
    } = player;
    const { player: playerSetting = {} } = setting;
    const {
      speed = "1",
      mute = false,
      volume = "100",
      deinterlace = true
    } = playerSetting;

    if (seekTime != null) {
      this.time(seekTime);
    }
    if (seekPosition != null) {
      this.position(seekPosition);
    }
    if (mute !== this.mute) {
      this.property("ao-mute", mute);
    }
    if (parseInt(volume, 10) !== this.volume) {
      this.property("ao-volume", parseInt(volume, 10));
    }
    if (
      trackCount.video > 0 &&
      track.video !== this.videoTrack &&
      (this.videoTrack > 0 || track.video > 0)
    ) {
      this.property("vid", track.video);
    }
    if (
      trackCount.audio > 0 &&
      track.audio !== this.audioTrack &&
      (this.audioTrack > 0 || track.audio > 0)
    ) {
      this.property("aid", track.audio);
    }
    if (
      trackCount.subtitle > 0 &&
      track.subtitle !== this.subtitleTrack &&
      (this.subtitleTrack > 0 || track.subtitle > 0)
    ) {
      this.property("sid", track.subtitle);
    }
    if (parseFloat(speed).toFixed(1) !== this.speed.toFixed(1)) {
      this.property("speed", parseFloat(speed));
    }
    if (pause !== this.pause) {
      this.property("pause", pause);
    }
    if (deinterlace !== this.deinterlace) {
      this.property("deinterlace", deinterlace);
    }
    if (dualMonoMode !== this.dualMonoMode) {
      this.property("ad-lavc-o", `dual_mono_mode=${dualMonoMode}`);
      this.dualMonoMode = dualMonoMode;
    }

    if (
      viewer.programs !== prevProps.viewer.programs ||
      viewer.index !== prevProps.viewer.index ||
      viewer.extraIndex !== prevProps.viewer.extraIndex
    ) {
      const { pause } = player;
      if (pause && !this.continuing) {
        this.close();
      } else {
        this.continuing = false;
        this.load(viewer.peakPlay);
      }
    }
  }

  componentWillUnmount() {
    for (const key of this.bindKeys) {
      Mousetrap.unbind(key);
    }
  }

  getRecorded() {
    const { viewer } = this.props;
    const { programs, index, extraIndex } = viewer;
    const program = programs[index];
    if (program.recorded && program.recorded[extraIndex]) {
      return program.recorded[extraIndex];
    }
    return program;
  }

  command(cmd: string, ...args: any[]) {
    if (this.mpv) {
      this.mpv.command(cmd, ...args);
    }
  }

  property(name: string, value: any) {
    if (this.mpv) {
      if (typeof value === "string") {
        this.options[name] = value;

        const { player } = this.props;
        const { time } = player;
        const options = [`start=${time / 1000}`];
        for (const name in this.options) {
          options.push(`${name}=${this.options[name]}`);
        }
        this.mpv.command("loadfile", this.path, "replace", options.join(","));
      } else {
        this.mpv.property(name, value);
      }
    }
  }

  observe(name: string, callback: (value: any) => void) {
    if (this.mpv) {
      this.mpv.observe(name);
      this.observers[name] = callback;
    }
  }

  close() {
    const { dispatch } = this.props;
    dispatch(ViewerActions.update({ playing: false }));
  }

  init() {
    const { setting } = this.props;
    const { player = {} } = setting;
    const {
      mute = false,
      volume = "100",
      speed = "1",
      deinterlace = true
    } = player;
    this.property("ao-mute", mute);
    this.property("volume", parseInt(volume, 10));
    this.property("speed", parseFloat(speed));
    this.property("deinterlace", deinterlace);
    this.property("cursor-autohide", true);

    this.observe("path", value => {
      this.path = value;
    });
    this.observe("file-format", value => {
      if (value === "hls,applehttp") {
        this.property("framedrop", false);
      }
    });
    this.observe("duration", value => {
      const { dispatch } = this.props;
      if (value > 10) {
        const duration = value * 1000;
        dispatch(PlayerActions.progress({ duration }));
      } else {
        const { duration } = this.getRecorded();
        dispatch(PlayerActions.progress({ duration }));
      }
    });
    this.observe("percent-pos", value => {
      if (this.seekable) {
        const { dispatch, player } = this.props;
        const { time, duration } = player;
        const position = value / 100;
        if (duration > 0) {
          dispatch(PlayerActions.progress({ position }));
        } else {
          const duration = time / position;
          dispatch(PlayerActions.progress({ duration, position }));
        }
      }
    });
    this.observe("time-pos", value => {
      const { dispatch, player } = this.props;
      let time = (value * 1000) % pcrFixer;
      this.pcrWraparound = value * 1000 > pcrFixer;
      if (this.pcrWraparound) {
        time %= pcrFixer;
      }
      if (this.seekable) {
        const { position, duration } = player;
        if (duration > 0) {
          dispatch(PlayerActions.progress({ time }));
        } else {
          const duration = time / position;
          dispatch(PlayerActions.progress({ duration, time }));
        }
      } else {
        const { duration } = player;
        time += this.ss * 1000;
        const position = time / duration;
        dispatch(PlayerActions.progress({ time, position }));
      }

      if (this.preseek > 0) {
        const { dispatch } = this.props;
        dispatch(PlayerActions.time(this.preseek));
        this.preseek = 0;
      }
    });
    this.observe("eof-reached", value => {
      if (value) {
        this.end();
      }
    });
    this.observe("ao-volume", value => {
      this.volume = value;
    });
    this.observe("ao-mute", value => {
      this.mute = value;
    });
    this.observe("track-list/count", count => {
      const { dispatch } = this.props;
      dispatch(
        PlayerActions.trackCount({
          video: 0,
          audio: 0,
          subtitle: 0
        })
      );
      for (let i = 0; i < count; i++) {
        const name = `track-list/${i}/type`;
        if (!this.observers[name]) {
          this.observe(name, type => {
            const { dispatch, player } = this.props;
            const { track, trackCount } = player;
            if (trackCount[type] != null) {
              trackCount[type]++;
              track[type] = 1;
            } else {
              trackCount[type] = 1;
            }
            dispatch(PlayerActions.trackCount(trackCount));
            dispatch(PlayerActions.track(track));
          });
        }
      }
    });
    this.observe("seekable", seekable => {
      this.seekable = seekable;
    });
    this.observe("playback-abort", value => {
      if (value) {
        Toast.show("Playback was aborted.", {
          ...toastOptions,
          duration: Toast.durations.LONG
        });
        this.end();
      }
    });
    this.observe("vid", videoTrack => {
      this.videoTrack = videoTrack;
    });
    this.observe("aid", audioTrack => {
      this.audioTrack = audioTrack;
    });
    this.observe("sid", subtitleTrack => {
      this.subtitleTrack = subtitleTrack;
    });
    this.observe("speed", value => {
      this.speed = value;
    });
    this.observe("pause", value => {
      this.pause = value;
    });
    this.observe("deinterlace", deinterlace => {
      this.deinterlace = deinterlace;
    });
  }

  load(peakPlay = false) {
    const { dispatch, viewer } = this.props;
    const { programs, index } = viewer;
    const program = programs[index];
    const recordedProgram = this.getRecorded();
    if (program && recordedProgram) {
      if (peakPlay && program.commentMaxSpeedTime) {
        this.preseek =
          new Date(program.commentMaxSpeedTime).getTime() -
          new Date(recordedProgram.start).getTime();
      } else {
        this.preseek =
          new Date(program.start).getTime() -
          new Date(recordedProgram.start).getTime();
      }

      let [uri, query] = recordedProgram.stream.split("?");
      const options = [];
      for (const name in this.options) {
        options.push(`${name}=${this.options[name]}`);
      }
      this.command("loadfile", `${uri}?${query}`, "replace", options.join(","));
      this.ss = 0;
      dispatch(PlayerActions.play());
    }
  }

  continue() {
    const { dispatch, viewer } = this.props;
    const { programs, index, extraIndex } = viewer;
    const program = programs[index];
    const nextExtraIndex = extraIndex + 1;
    const nextIndex = index + 1;
    if (program.recorded && program.recorded[nextExtraIndex]) {
      dispatch(
        ViewerActions.update({ extraIndex: nextExtraIndex, peakPlay: false })
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
      this.close();
    }
  }

  repeat() {
    const { dispatch, viewer } = this.props;
    const { extraIndex } = viewer;
    if (extraIndex === 0) {
      this.load(false);
    } else {
      dispatch(ViewerActions.update({ extraIndex: 0, peakPlay: false }));
    }
  }

  end() {
    const { dispatch, setting } = this.props;
    const { player = {} } = setting;
    const { repeat = "continue" } = player;
    switch (repeat) {
      case "continue":
        this.continuing = true;
        this.continue();
        break;
      case "repeat":
        this.continuing = true;
        this.repeat();
        break;
      default:
        this.close();
    }
  }

  time(time: number) {
    if (this.seekable) {
      if (this.pcrWraparound) {
        const { player } = this.props;
        const { duration } = player;
        this.position(time / duration);
      } else {
        this.property("time-pos", time / 1000);
      }
    } else {
      const { dispatch, setting } = this.props;
      const { backend = {} } = setting;
      const { type = "chinachu" } = backend;
      if (type === "chinachu" || type === "epgstation") {
        const ss = Math.floor(time / 1000);
        const [uri, query] = this.path.split("?");
        const options = [];
        for (const name in this.options) {
          options.push(`${name}=${this.options[name]}`);
        }
        this.command(
          "loadfile",
          `${uri}?${qs.stringify({ ...qs.parse(query), ss })}`,
          "replace",
          options.join(",")
        );
        this.ss = ss;
        dispatch(PlayerActions.play());
      }
    }
  }

  position(position: number) {
    if (this.seekable) {
      this.property("percent-pos", position * 100);
    } else {
      const { player } = this.props;
      const { duration } = player;
      this.time(position * duration);
    }
  }
}

export default connect(
  ({
    player,
    setting,
    viewer
  }: {
    player: PlayerState;
    setting: SettingState;
    viewer: ViewerState;
  }) => ({
    player,
    setting,
    viewer
  })
)(Player);

const pcrFixer = 2 ** 33 / 90;
