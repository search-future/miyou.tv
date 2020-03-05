import React, { memo, useCallback } from "react";
import {
  Switch,
  TouchableOpacity,
  View,
  Platform,
  StyleSheet
} from "react-native";
import { Text } from "react-native-elements";
import { Menu, MenuTrigger, MenuOptions } from "react-native-popup-menu";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector } from "react-redux";

import colorStyle, { light } from "../styles/color";
import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { PlayerActions } from "../modules/player";
import { SettingActions, SettingState } from "../modules/setting";

type Setting = SettingState & {
  player?: {
    speed?: string;
    deinterlace?: boolean;
    repeat?: string;
  };
  commentPlayer?: {
    duration?: string;
    delay?: string;
    maxLines?: string;
    maxComments?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const PlayerMenu = memo(
  ({ triggerComponent }: { triggerComponent: JSX.Element }) => {
    const audioTrackCount = useSelector<State, number>(
      ({ player }) => player.trackCount.audio
    );

    return (
      <Menu>
        <MenuTrigger customStyles={{ triggerWrapper: styles.button }}>
          {triggerComponent}
        </MenuTrigger>
        <MenuOptions
          customStyles={{ optionsContainer: styles.optionContainer }}
        >
          <View
            style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
          >
            <Text style={[colorStyle.light, styles.optionLabel]}>再生速度</Text>
            <SpeedSwitch />
          </View>
          {Platform.OS === "web" && (
            <View
              style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
            >
              <Text style={[colorStyle.light, styles.optionLabel]}>
                インターレース解除
              </Text>
              <DeinterlaceSwitch />
            </View>
          )}
          {audioTrackCount > 1 && (
            <View
              style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
            >
              <Text style={[colorStyle.light, styles.optionLabel]}>
                音声トラック
              </Text>
              <AudioTrackSwitch />
            </View>
          )}
          {Platform.OS === "web" && (
            <View
              style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
            >
              <Text style={[colorStyle.light, styles.optionLabel]}>
                デュアルモノラル
              </Text>
              <DualMonoModeSwitch />
            </View>
          )}
          <View
            style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
          >
            <Text style={[colorStyle.light, styles.optionLabel]}>連続再生</Text>
            <RepeatSwitch />
          </View>
          <View
            style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
          >
            <Text style={[colorStyle.light, styles.optionLabel]}>
              コメント表示時間
            </Text>
            <CommentDurationSwitch />
          </View>
          <View
            style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
          >
            <Text style={[colorStyle.light, styles.optionLabel]}>
              コメント遅延時間
            </Text>
            <CommentDelaySwitch />
          </View>
          <View
            style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
          >
            <Text style={[colorStyle.light, styles.optionLabel]}>
              コメントライン数
            </Text>
            <CommentMaxLinesSwitch />
          </View>
          <View
            style={[containerStyle.row, colorStyle.bgBlack, styles.optionRow]}
          >
            <Text style={[colorStyle.light, styles.optionLabel]}>
              コメント同時表示数
            </Text>
            <MaxCommentsSwitch />
          </View>
        </MenuOptions>
      </Menu>
    );
  }
);
export default PlayerMenu;

const PropertySwitch = memo(
  ({
    value,
    onPrevious,
    onNext
  }: {
    value: string | number;
    onPrevious: () => void;
    onNext: () => void;
  }) => (
    <View style={[containerStyle.row, containerStyle.center]}>
      <TouchableOpacity style={styles.button} onPress={onPrevious}>
        <FontAwesome5Icon name="caret-left" solid color={light} size={24} />
      </TouchableOpacity>
      <Text style={[colorStyle.light, styles.optionValue]}>{value}</Text>
      <TouchableOpacity style={styles.button} onPress={onNext}>
        <FontAwesome5Icon name="caret-right" solid color={light} size={24} />
      </TouchableOpacity>
    </View>
  )
);

const SpeedSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, number>(({ setting }) =>
    parseFloat(setting.player?.speed || "1")
  );

  const onPrevious = useCallback(() => {
    const speed = value - 0.1;
    if (value > 0) {
      dispatch(SettingActions.update("player", { speed }));
    }
  }, [value]);
  const onNext = useCallback(() => {
    const speed = value + 0.1;
    if (value <= 8) {
      dispatch(SettingActions.update("player", { speed }));
    }
  }, [value]);

  return (
    <PropertySwitch
      value={value.toFixed(1)}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );
});

const AudioTrackSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, number>(({ player }) => player.track.audio);
  const track = useSelector<State, number>(
    ({ player }) => player.trackCount.audio
  );

  const onPrevious = useCallback(() => {
    const audio = value - 1;
    if (audio > 0) {
      dispatch(PlayerActions.track({ audio }));
    } else {
      dispatch(PlayerActions.track({ audio: track }));
    }
  }, [value, track]);
  const onNext = useCallback(() => {
    const audio = value + 1;
    if (audio <= track) {
      dispatch(PlayerActions.track({ audio }));
    } else {
      dispatch(PlayerActions.track({ audio: 1 }));
    }
  }, [value, track]);

  return (
    <PropertySwitch value={value} onPrevious={onPrevious} onNext={onNext} />
  );
});

const DeinterlaceSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, boolean>(
    ({ setting }) =>
      setting.player?.deinterlace == null || setting.player?.deinterlace
  );

  const onChange = useCallback(deinterlace => {
    dispatch(SettingActions.update("player", { deinterlace }));
  }, []);

  return (
    <Switch style={styles.optionValue} value={value} onValueChange={onChange} />
  );
});

const DualMonoModeSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, string>(({ player }) => player.dualMonoMode);

  const onPrevious = useCallback(() => {
    const keys = Object.keys(dualMonoTable);
    const index = keys.indexOf(value) - 1;
    if (keys[index]) {
      dispatch(PlayerActions.dualMonoMode(keys[index]));
    } else {
      dispatch(PlayerActions.dualMonoMode(keys[keys.length - 1]));
    }
  }, [value]);
  const onNext = useCallback(() => {
    const keys = Object.keys(dualMonoTable);
    const index = keys.indexOf(value) + 1;
    if (keys[index]) {
      dispatch(PlayerActions.dualMonoMode(keys[index]));
    } else {
      dispatch(PlayerActions.dualMonoMode(keys[0]));
    }
  }, [value]);

  return (
    <PropertySwitch
      value={dualMonoTable[value]}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );
});

const RepeatSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, string>(
    ({ setting }) => setting.player?.repeat || "continue"
  );

  const onPrevious = useCallback(() => {
    const keys = Object.keys(repeatTable);
    const index = keys.indexOf(value) - 1;
    if (keys[index]) {
      dispatch(
        SettingActions.update("player", {
          repeat: keys[index]
        })
      );
    } else {
      dispatch(
        SettingActions.update("player", {
          repeat: keys[keys.length - 1]
        })
      );
    }
  }, [value]);

  const onNext = useCallback(() => {
    const keys = Object.keys(repeatTable);
    const index = keys.indexOf(value) + 1;
    if (keys[index]) {
      dispatch(
        SettingActions.update("player", {
          repeat: keys[index]
        })
      );
    } else {
      dispatch(
        SettingActions.update("player", {
          repeat: keys[0]
        })
      );
    }
  }, [value]);

  return (
    <PropertySwitch
      value={repeatTable[value]}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );
});

const CommentDurationSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.duration || "5000", 10)
  );

  const onPrevious = useCallback(() => {
    const duration = value - 500;
    if (duration > 500) {
      dispatch(SettingActions.update("commentPlayer", { duration }));
    } else {
      dispatch(
        SettingActions.update("commentPlayer", {
          duration: 1000
        })
      );
    }
  }, [value]);
  const onNext = useCallback(() => {
    const duration = value + 500;
    dispatch(SettingActions.update("commentPlayer", { duration }));
  }, [value]);

  return (
    <PropertySwitch
      value={`${(value / 1000).toFixed(1)}秒`}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );
});

const CommentDelaySwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.delay || "0", 10)
  );

  const onPrevious = useCallback(() => {
    dispatch(SettingActions.update("commentPlayer", { delay: value - 500 }));
  }, [value]);
  const onNext = useCallback(() => {
    dispatch(SettingActions.update("commentPlayer", { delay: value + 500 }));
  }, [value]);

  return (
    <PropertySwitch
      value={`${(value / 1000).toFixed(1)}秒`}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );
});

const CommentMaxLinesSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.maxLines || "10", 10)
  );

  const onPrevious = useCallback(() => {
    const maxLines = value - 1;
    if (maxLines > 5) {
      dispatch(SettingActions.update("commentPlayer", { maxLines }));
    } else {
      dispatch(
        SettingActions.update("commentPlayer", {
          maxLines: 5
        })
      );
    }
  }, [value]);
  const onNext = useCallback(() => {
    const maxLines = value + 1;
    dispatch(
      SettingActions.update("commentPlayer", {
        maxLines
      })
    );
  }, [value]);

  return (
    <PropertySwitch value={value} onPrevious={onPrevious} onNext={onNext} />
  );
});

const MaxCommentsSwitch = memo(() => {
  const dispatch = useDispatch();
  const value = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.maxComments || "50", 10)
  );

  const onPrevious = useCallback(() => {
    const maxComments = value - 5;
    if (maxComments > 5) {
      dispatch(
        SettingActions.update("commentPlayer", { maxComments: maxComments })
      );
    } else {
      dispatch(
        SettingActions.update("commentPlayer", {
          maxComments: 5
        })
      );
    }
  }, [value]);
  const onNext = useCallback(() => {
    const maxComments = value + 5;
    dispatch(
      SettingActions.update("commentPlayer", {
        maxComments: maxComments
      })
    );
  }, [value]);

  return (
    <PropertySwitch value={value} onPrevious={onPrevious} onNext={onNext} />
  );
});

const dualMonoTable: { [key: string]: string } = {
  auto: "自動",
  both: "主/副",
  main: "主音声",
  sub: "副音声"
};

const repeatTable: { [key: string]: string } = {
  stop: "停止",
  continue: "連続再生",
  repeat: "リピート"
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  optionContainer: {
    width: 280
  },
  optionRow: {
    height: 40
  },
  optionLabel: {
    flex: 1,
    marginHorizontal: 8
  },
  optionValue: {
    marginHorizontal: 8
  }
});
