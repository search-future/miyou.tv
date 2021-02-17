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
  memo,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef
} from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
  ImageSourcePropType
} from "react-native";
import { ButtonGroup, Image, Text, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import Axios from "axios";

import CommentInfo from "./CommentInfo";
import CommentPlayer from "./CommentPlayer";
import Controller from "./Controller";
import Loading from "./Loading";
import Player from "./Player";
import PlayerContainer from "./PlayerContainer";
import Seekbar from "./Seekbar";
import ViewerInfo from "./ViewerInfo";
import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { SettingState } from "../modules/setting";
import { ViewerActions, ViewerProgram } from "../modules/viewer";

type Setting = SettingState & {
  commentPlayer?: {
    enabled?: boolean;
  };
  viewer?: {
    expand?: boolean;
  };
};
type State = RootState & {
  setting: Setting;
};

const Viewer = memo(() => {
  const layoutCallbackId = useRef<number>();

  const dispatch = useDispatch();
  const expand = useSelector<State, boolean>(
    ({ setting }) => setting.viewer?.expand
  );
  const commentEnabled = useSelector<State, boolean>(
    ({ setting }) =>
      setting.commentPlayer?.enabled == null || setting.commentPlayer?.enabled
  );
  const programs = useSelector<State, ViewerProgram[]>(
    ({ viewer }) => viewer.programs,
    shallowEqual
  );
  const index = useSelector<State, number>(({ viewer }) => viewer.index);
  const mode = useSelector<State, string>(({ viewer }) => viewer.mode);
  const playing = useSelector<State, boolean>(({ viewer }) => viewer.playing);
  const peakPlayEnabled = useSelector<State, boolean>(
    ({ viewer }) => viewer.peakPlay
  );
  const controlEnabled = useSelector<State, boolean>(
    ({ viewer }) => viewer.control
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isLandscape, setLandscape] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(
    Platform.OS === "web" ? 1 : 0
  );
  const [preview, setPreview] = useState<ImageSourcePropType>({});

  const { theme } = useContext(ThemeContext);

  const program = programs[index];
  const tabIndex = playing ? selectedIndex : 0;

  const screenHeight = useMemo(() => {
    let screenHeight = containerHeight;
    if (!playing || !expand) {
      screenHeight = (containerWidth / 16) * 9;
      const maxScreenHeight = containerHeight / 2 - 40;
      if (screenHeight > maxScreenHeight) {
        screenHeight = maxScreenHeight;
      }
    }
    return screenHeight;
  }, [expand, playing, containerWidth, containerHeight]);
  const tabButtons = useMemo(
    () => [
      {
        element: () => (
          <Text style={[{ color: theme.colors?.control }]}>情報</Text>
        )
      },
      {
        element: () => (
          <Text style={[{ color: theme.colors?.control }]}>コメント</Text>
        )
      }
    ],
    [theme.colors?.control]
  );

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
      dispatch(ViewerActions.update({ playing: false }));
    },
    []
  );
  useEffect(() => {
    if (program?.preview) {
      if (Platform.OS === "web") {
        setPreview({});
        Axios.get(program.preview, {
          headers: program.authHeaders,
          responseType: "blob"
        }).then(({ data }) => {
          setPreview({
            uri: URL.createObjectURL(data)
          });
        });
      } else {
        setPreview({
          uri: program.preview,
          headers: program.authHeaders
        });
      }
    }
  }, [program]);

  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    if (layoutCallbackId.current != null) {
      clearTimeout(layoutCallbackId.current);
    }
    const { layout } = nativeEvent;
    const containerWidth = layout.width;
    const containerHeight = layout.height;
    const isLandscape =
      Platform.OS === "web"
        ? layout.width > breakpoint
        : layout.width > layout.height;
    layoutCallbackId.current = setTimeout(() => {
      setContainerWidth(containerWidth);
      setContainerHeight(containerHeight);
      setLandscape(isLandscape);
    }, 200);
  }, []);
  const selectedIndexChange = useCallback((selectedIndex: number) => {
    setSelectedIndex(selectedIndex);
  }, []);
  const play = useCallback(() => {
    dispatch(ViewerActions.update({ playing: true, peakPlay: false }));
  }, []);
  const peakPlay = useCallback(() => {
    let extraIndex = 0;
    if (program.recorded && program.commentMaxSpeedTime) {
      const peakTime = new Date(program.commentMaxSpeedTime).getTime();
      extraIndex = program.recorded.findIndex(
        ({ start, end }) =>
          new Date(start).getTime() < peakTime &&
          new Date(end).getTime() > peakTime
      );
      if (extraIndex < 0) {
        extraIndex = 0;
      }
    }
    dispatch(
      ViewerActions.update({
        playing: true,
        peakPlay: true,
        extraIndex
      })
    );
  }, [program]);
  const close = useCallback(() => {
    dispatch(ViewerActions.close());
  }, []);
  const dock = useCallback(() => {
    dispatch(ViewerActions.dock());
  }, []);
  const undock = useCallback(() => {
    dispatch(ViewerActions.undock());
  }, []);
  const previous = useCallback(() => {
    const previousIndex = index - 1;
    const program = programs[previousIndex];
    if (program) {
      let extraIndex = 0;
      if (peakPlayEnabled && program.recorded && program.commentMaxSpeedTime) {
        const peakTime = new Date(program.commentMaxSpeedTime).getTime();
        extraIndex = program.recorded.findIndex(
          ({ start, end }) =>
            new Date(start).getTime() < peakTime &&
            new Date(end).getTime() > peakTime
        );
        if (extraIndex < 0) {
          extraIndex = 0;
        }
      }
      dispatch(ViewerActions.update({ index: previousIndex, extraIndex }));
    }
  }, [programs, index, peakPlayEnabled]);
  const next = useCallback(() => {
    const nextIndex = index + 1;
    const program = programs[nextIndex];
    if (program) {
      let extraIndex = 0;
      if (peakPlayEnabled && program.recorded && program.commentMaxSpeedTime) {
        const peakTime = new Date(program.commentMaxSpeedTime).getTime();
        extraIndex = programs.findIndex(
          ({ start, end }) =>
            new Date(start).getTime() < peakTime &&
            new Date(end).getTime() > peakTime
        );
        if (extraIndex < 0) {
          extraIndex = 0;
        }
      }
      dispatch(ViewerActions.update({ index: nextIndex, extraIndex }));
    }
  }, [programs, index, peakPlayEnabled]);

  return (
    <View
      style={[
        containerStyle.container,
        { backgroundColor: theme.colors?.appBg }
      ]}
      onLayout={onLayout}
    >
      {program && containerWidth > 0 && (
        <View
          style={isLandscape ? [containerStyle.row, styles.view] : styles.view}
        >
          <View
            style={[isLandscape ? styles.primaryColumn : styles.primaryRow]}
          >
            <View
              style={[isLandscape ? { flex: 1 } : { height: screenHeight }]}
            >
              <Image
                containerStyle={[
                  StyleSheet.absoluteFill,
                  styles.mediaContainer
                ]}
                style={styles.image}
                source={preview}
                resizeMode="contain"
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  containerStyle.row,
                  containerStyle.center
                ]}
              >
                <TouchableOpacity style={styles.button} onPress={play}>
                  <FontAwesome5Icon
                    name="play"
                    solid
                    color={theme.colors?.control}
                    size={24}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={peakPlay}>
                  <FontAwesome5Icon
                    name="star"
                    solid
                    color={theme.colors?.control}
                    size={24}
                  />
                </TouchableOpacity>
              </View>
              {playing && (
                <PlayerContainer
                  style={[StyleSheet.absoluteFill, styles.mediaContainer]}
                >
                  <Player />
                  {commentEnabled && (
                    <View style={StyleSheet.absoluteFill}>
                      <CommentPlayer />
                    </View>
                  )}
                </PlayerContainer>
              )}
              {playing && controlEnabled && (
                <View
                  style={[
                    styles.control,
                    { backgroundColor: theme.colors?.controlFg }
                  ]}
                >
                  <Seekbar />
                  <Controller />
                </View>
              )}
              <Loading />
            </View>
            {(!playing || controlEnabled || (!expand && !isLandscape)) && (
              <View
                style={[
                  containerStyle.row,
                  containerStyle.nowrap,
                  ...(expand || isLandscape
                    ? [
                        styles.primaryHeaderExpand,
                        { backgroundColor: theme.colors?.controlFg }
                      ]
                    : [{ backgroundColor: theme.colors?.controlBg }])
                ]}
              >
                {mode === "stack" && (
                  <TouchableOpacity style={styles.button} onPress={close}>
                    <FontAwesome5Icon
                      name="chevron-circle-left"
                      solid
                      color={theme.colors?.control}
                      size={24}
                    />
                  </TouchableOpacity>
                )}
                {mode === "view" && (
                  <TouchableOpacity style={styles.button} onPress={undock}>
                    <FontAwesome5Icon
                      name="external-link-alt"
                      solid
                      color={theme.colors?.control}
                      size={24}
                    />
                  </TouchableOpacity>
                )}
                {mode === "child" && (
                  <TouchableOpacity style={styles.button} onPress={dock}>
                    <FontAwesome5Icon
                      name="columns"
                      solid
                      color={theme.colors?.control}
                      size={24}
                    />
                  </TouchableOpacity>
                )}
                <Text h2 style={[[{ color: theme.colors?.control }]]}>
                  {program.rank ? `${program.rank}. ` : ""}
                  {program.fullTitle}
                </Text>
                {mode === "view" && (
                  <TouchableOpacity style={styles.button} onPress={close}>
                    <FontAwesome5Icon
                      name="times"
                      solid
                      color={theme.colors?.control}
                      size={24}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {(!playing || controlEnabled) && programs[index - 1] && (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrevious]}
                onPress={previous}
              >
                <FontAwesome5Icon
                  name="chevron-left"
                  solid
                  style={styles.iconShadow}
                  size={24}
                  color={theme.colors?.control}
                />
              </TouchableOpacity>
            )}
            {(!playing || controlEnabled) && programs[index + 1] && (
              <TouchableOpacity
                style={[styles.button, styles.buttonNext]}
                onPress={next}
              >
                <FontAwesome5Icon
                  name="chevron-right"
                  solid
                  style={styles.iconShadow}
                  color={theme.colors?.control}
                  size={24}
                />
              </TouchableOpacity>
            )}
          </View>
          {(!playing || !expand) && (
            <View
              style={[
                isLandscape ? styles.secondaryColumn : styles.secondaryRow,
                { backgroundColor: theme.colors?.controlBg }
              ]}
            >
              <ButtonGroup
                containerStyle={[
                  {
                    backgroundColor: theme.colors?.controlBg,
                    borderColor: theme.colors?.controlBorder
                  }
                ]}
                innerBorderStyle={{ color: theme.colors?.controlBorder }}
                selectedButtonStyle={[
                  { backgroundColor: theme.colors?.controlBgActive }
                ]}
                containerBorderRadius={0}
                buttons={tabButtons}
                selectedIndex={tabIndex}
                onPress={selectedIndexChange}
              />
              {tabIndex === 0 && <ViewerInfo />}
              {tabIndex === 1 && <CommentInfo />}
            </View>
          )}
        </View>
      )}
    </View>
  );
});
export default Viewer;

const breakpoint = 640;

const styles = StyleSheet.create({
  title: {
    flex: 1,
    marginHorizontal: 16,
    height: 30,
    overflow: "hidden"
  },
  view: {
    flex: 1,
    alignItems: "stretch"
  },
  primaryRow: {
    flexDirection: "column-reverse"
  },
  secondaryRow: {
    flex: 1
  },
  primaryColumn: {
    flex: 5
  },
  secondaryColumn: {
    flex: 4,
    maxWidth: 480
  },
  primaryHeaderExpand: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  control: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0
  },
  mediaContainer: {
    backgroundColor: "#000000"
  },
  image: {
    flex: 1
  },
  iconShadow: {
    opacity: 0.6,
    textShadowColor: "#000000",
    textShadowOffset: {
      height: 1,
      width: 1
    },
    textShadowRadius: 5
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  buttonPrevious: {
    left: 0,
    position: "absolute",
    top: 40
  },
  buttonNext: {
    position: "absolute",
    right: 0,
    top: 40
  }
});
