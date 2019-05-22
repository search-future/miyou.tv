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
import { Platform, StyleSheet } from "react-native";
import Video from "react-native-video";
import KeepAwake from "react-native-keep-awake";
import Toast from "react-native-root-toast";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import qs from "qs";
// @ts-ignore
import { VLCPlayer } from "react-native-yz-vlcplayer";
// @ts-ignore
import { Immersive } from "react-native-immersive";

import { PlayerState, PlayerActions } from "../modules/player";
import { NetworkState } from "../modules/network";
import { SettingState } from "../modules/setting";
import { ViewerState, ViewerActions } from "../modules/viewer";
import { toastOptions } from "../config/constants";

type Props = {
  dispatch: Dispatch;
  network: NetworkState;
  player: PlayerState;
  setting: SettingState & {
    player?: {
      mute?: boolean;
      volume?: string;
      speed?: string;
      repeat?: string;
    };
  };
  viewer: ViewerState;
};
type State = {
  ss: number;
  reset: boolean;
};
class Player extends Component<Props, State> {
  video: Video | null = null;
  vlc: VLCPlayer | null = null;
  state: State = {
    ss: 0,
    reset: false
  };
  preseek = 0;

  render() {
    const { network, setting, player } = this.props;
    const { backend = {}, player: playerSetting = {} } = setting;
    const {
      type = "chinachu",
      mobileStreamType = "mp4",
      mobileStreamParams = "b:v=1M&b:a=128k&s=1280x720"
    } = backend;
    const { mute = false, volume = "100", speed = "1" } = playerSetting;
    const { pause } = player;
    const { ss, reset } = this.state;

    const recordedProgram = this.getRecorded();
    let [uri, query] = recordedProgram.stream.split("?");
    if (type === "chinachu" && network.type.indexOf("cell") >= 0) {
      uri = uri.replace(/[^.]+$/, mobileStreamType);
      query = mobileStreamParams;
    }

    if (reset) {
      return null;
    }

    if (type === "chinachu") {
      uri = uri.replace(/m2ts$/, "mp4");
      return (
        <VLCPlayer
          style={styles.video}
          paused={pause}
          muted={mute}
          volume={parseInt(volume, 10)}
          initOptions={["--deinterlace=1", "--deinterlace-mode=discard"]}
          source={{
            uri: `${uri}?${qs.stringify({ ...qs.parse(query), ss })}`
          }}
          rate={parseFloat(speed)}
          ref={(vlc: VLCPlayer) => {
            this.vlc = vlc;
          }}
          onOpen={() => {
            const { dispatch } = this.props;
            dispatch(PlayerActions.play());
          }}
          onProgress={({ currentTime = 0 }: any) => {
            const { dispatch } = this.props;
            const { ss } = this.state;
            const { duration } = this.getRecorded();
            const time = currentTime + ss * 1000;
            dispatch(
              PlayerActions.progress({
                duration,
                time,
                position: time / duration
              })
            );
            if (this.preseek > 0) {
              this.time(this.preseek);
              this.preseek = 0;
            }
          }}
          onError={() => {
            Toast.show("Playback error", {
              ...toastOptions,
              duration: Toast.durations.LONG
            });
            this.end();
          }}
          onEnd={() => {
            this.end();
          }}
        />
      );
    }
    return (
      <Video
        style={styles.video}
        resizeMode="contain"
        paused={pause}
        rate={parseFloat(speed)}
        muted={mute}
        volume={parseInt(volume, 10) / 100}
        source={{ uri: `${uri}?${query}`, type: "m3u8" } as any}
        ref={ref => {
          this.video = ref;
        }}
        onProgress={({ currentTime, seekableDuration }) => {
          const { dispatch } = this.props;
          dispatch(
            PlayerActions.progress({
              duration: seekableDuration * 1000,
              time: currentTime * 1000,
              position: currentTime / seekableDuration
            })
          );
          if (this.preseek > 0) {
            this.time(this.preseek);
            this.preseek = 0;
          }
        }}
        onEnd={() => {
          this.end();
        }}
      />
    );
  }

  componentDidMount() {
    const { viewer } = this.props;
    this.load(viewer.peakPlay);

    if (Platform.OS === "android") {
      Immersive.on();
    }
    KeepAwake.activate();
  }

  shouldComponentUpdate(nextProps: Props) {
    const { player } = this.props;
    return (
      nextProps.player === player ||
      nextProps.player.pause !== player.pause ||
      (nextProps.player.time === player.time &&
        nextProps.player.position === player.position)
    );
  }

  componentDidUpdate(prevProps: Props) {
    const { viewer, player } = this.props;
    const { reset } = this.state;
    const { pause } = player;

    if (
      player.seekTime != null &&
      player.seekTime !== prevProps.player.seekTime
    ) {
      this.time(player.seekTime);
    }
    if (
      player.seekPosition != null &&
      player.seekPosition !== prevProps.player.seekPosition
    ) {
      this.position(player.seekPosition);
    }

    if (
      viewer.programs !== prevProps.viewer.programs ||
      viewer.index !== prevProps.viewer.index ||
      viewer.extraIndex !== prevProps.viewer.extraIndex
    ) {
      if (pause) {
        this.close();
      } else {
        this.load(viewer.peakPlay);
      }
    }
    if (reset) {
      this.setState({ reset: false });
    }
    if (Platform.OS === "android") {
      Immersive.on();
    }
  }

  componentWillUnmount() {
    if (Platform.OS === "android") {
      Immersive.off();
    }
    KeepAwake.deactivate();
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
      dispatch(
        PlayerActions.progress({
          duration: 0,
          time: 0,
          position: 0
        })
      );
      this.setState({ reset: true });
    }
  }

  close() {
    const { dispatch } = this.props;
    dispatch(ViewerActions.update({ playing: false }));
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
    const { setting } = this.props;
    const { player = {} } = setting;
    const { repeat = "continue" } = player;
    switch (repeat) {
      case "continue":
        this.continue();
        break;
      case "repeat":
        this.repeat();
        break;
      default:
        this.close();
    }
  }

  time(time: number) {
    if (this.vlc) {
      const { dispatch } = this.props;
      this.setState({ ss: Math.floor(time / 1000) });
      dispatch(PlayerActions.play());
    } else if (this.video) {
      this.video.seek(Math.floor(time / 1000));
    }
  }

  position(position: number) {
    const { player } = this.props;
    const { duration } = player;
    this.time(position * duration);
  }
}

export default connect(
  ({
    network,
    player,
    setting,
    viewer
  }: {
    network: NetworkState;
    player: PlayerState;
    setting: SettingState;
    viewer: ViewerState;
  }) => ({
    network,
    player,
    setting,
    viewer
  })
)(Player);

const styles = StyleSheet.create({
  video: {
    flex: 1
  }
});
