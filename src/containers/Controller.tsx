/*!
Copyright 2016-2020 Brazil Ltd.
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

import React, { useCallback, useMemo, memo } from "react";
import { TouchableOpacity, View, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { Menu, MenuTrigger, MenuOptions } from "react-native-popup-menu";
import { useDispatch, useSelector } from "react-redux";

import CustomSlider from "../components/CustomSlider";
import PlayerMenu from "./PlayerMenu";
import colorStyle, { light } from "../styles/color";
import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { SettingState, SettingActions } from "../modules/setting";
import { PlayerActions } from "../modules/player";
import { WindowActions } from "../modules/window";

type Setting = SettingState & {
  player?: {
    mute?: boolean;
    volume?: string;
  };
  commentPlayer?: {
    enabled?: boolean;
  };
  viewer?: {
    expand: boolean;
  };
};
type State = RootState & {
  setting: Setting;
};

const Controller = memo(() => (
  <View style={[containerStyle.row, styles.container]}>
    <View style={[containerStyle.row, containerStyle.left, styles.left]}>
      <VolumeController />
    </View>
    <View style={[containerStyle.row, containerStyle.center, styles.center]}>
      <JumpButton seconds={jumpBackwardSeconds} />
      <TogglePlayButton />
      <JumpButton seconds={jumpForwardSeconds} />
    </View>
    <View style={[containerStyle.row, containerStyle.right, styles.right]}>
      <ToggleCommentButton />
      <ToggleExpandButton />
      {Platform.OS === "web" && <ToggleFullScreenButton />}
      <PlayerMenu
        triggerComponent={
          <FontAwesome5Icon name="cog" solid color={light} size={24} />
        }
      />
    </View>
  </View>
));
export default Controller;

const TogglePlayButton = memo(() => {
  const dispatch = useDispatch();
  const pause = useSelector<State, boolean>(({ player }) => player.pause);

  const onPress = useCallback(() => {
    dispatch(PlayerActions.toggle());
  }, []);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <FontAwesome5Icon
        name={pause ? "play" : "pause"}
        solid
        color={light}
        size={24}
      />
    </TouchableOpacity>
  );
});

const JumpButton = memo(({ seconds }: { seconds: number }) => {
  const dispatch = useDispatch();
  const time = useSelector<State, number>(({ player }) => player.time);

  const onPress = useCallback(() => {
    dispatch(PlayerActions.time(time + seconds * 1000));
  }, [time, seconds]);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      {seconds < 0 && (
        <FontAwesome5Icon name="caret-left" solid color={light} size={24} />
      )}
      <Text style={colorStyle.light}>{Math.abs(seconds)}</Text>
      {seconds > 0 && (
        <FontAwesome5Icon name="caret-right" solid color={light} size={24} />
      )}
    </TouchableOpacity>
  );
});

const VolumeController = memo(() => {
  const dispatch = useDispatch();
  const mute = useSelector<State, boolean>(
    ({ setting }) => setting.player?.mute
  );
  const volume = useSelector<State, number>(({ setting }) =>
    parseInt(
      setting.player?.volume != null ? setting.player?.volume : "100",
      10
    )
  );

  const volumeIcon = useMemo(() => {
    if (mute) {
      return "volume-mute";
    }
    if (volume > 50) {
      return "volume-up";
    }
    if (volume > 0) {
      return "volume-down";
    }
    return "volume-off";
  }, [mute, volume]);

  const toggleMute = useCallback(() => {
    dispatch(SettingActions.update("player", { mute: !mute }));
  }, [mute]);
  const volumeChange = useCallback(volume => {
    dispatch(SettingActions.update("player", { volume }));
  }, []);

  return (
    <Menu>
      <MenuTrigger customStyles={{ triggerWrapper: styles.button }}>
        <FontAwesome5Icon name={volumeIcon} solid color={light} size={24} />
      </MenuTrigger>
      <MenuOptions>
        <View
          style={[containerStyle.row, colorStyle.bgBlack, styles.volumeOption]}
        >
          <TouchableOpacity style={styles.button} onPress={toggleMute}>
            <FontAwesome5Icon name={volumeIcon} solid color={light} size={24} />
          </TouchableOpacity>
          <CustomSlider
            style={styles.slider}
            maximumValue={100}
            minimumValue={0}
            step={1}
            value={volume}
            maximumTrackTintColor="#ffffff20"
            minimumTrackTintColor="#ffffffe2"
            thumbRound
            onValueChange={volumeChange}
          />
        </View>
      </MenuOptions>
    </Menu>
  );
});

const ToggleCommentButton = memo(() => {
  const dispatch = useDispatch();
  const enabled = useSelector<State, boolean>(
    ({ setting }) =>
      setting.commentPlayer?.enabled == null || setting.commentPlayer?.enabled
  );

  const onPress = useCallback(() => {
    dispatch(SettingActions.update("commentPlayer", { enabled: !enabled }));
  }, [enabled]);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <FontAwesome5Icon
        name={enabled ? "comment-dots" : "comment-slash"}
        solid
        color={light}
        size={24}
      />
    </TouchableOpacity>
  );
});

const ToggleExpandButton = memo(() => {
  const dispatch = useDispatch();
  const expand = useSelector<State, boolean>(
    ({ setting }) => setting.viewer?.expand
  );

  const onPress = useCallback(() => {
    dispatch(SettingActions.update("viewer", { expand: !expand }));
  }, [expand]);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <FontAwesome5Icon
        name={expand ? "bars" : "arrows-alt"}
        solid
        color={light}
        size={24}
      />
    </TouchableOpacity>
  );
});

const ToggleFullScreenButton = memo(() => {
  const dispatch = useDispatch();
  const fullScreen = useSelector<State, boolean>(
    ({ window }) => window.fullScreen
  );

  const onPress = useCallback(() => {
    dispatch(WindowActions.setFullScreen(!fullScreen));
  }, [fullScreen]);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <FontAwesome5Icon
        name={fullScreen ? "compress" : "expand"}
        color={light}
        size={24}
      />
    </TouchableOpacity>
  );
});

const jumpForwardSeconds = 30;
const jumpBackwardSeconds = -10;

const styles = StyleSheet.create({
  container: {
    minHeight: 40
  },
  left: {
    flex: 1,
    minWidth: Platform.OS === "web" ? 40 : 0
  },
  center: {
    flex: 1,
    minWidth: Platform.OS === "web" ? 120 : 0
  },
  right: {
    flex: 1,
    minWidth: Platform.OS === "web" ? 160 : 0
  },
  slider: {
    flex: 1,
    height: 40
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  volumeOption: {
    height: 40
  }
});
