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
  useRef,
  ReactText,
  useMemo
} from "react";
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  ListRenderItem
} from "react-native";
import { Text, ListItem, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import DocumentPicker from "react-native-document-picker";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import DatePicker from "../components/DatePicker";
import IconSelector from "../components/IconSelector";
import TimePicker from "../components/TimePicker";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { RootState } from "../modules";
import { FileActions, FileProgram } from "../modules/file";
import { SettingActions, SettingState } from "../modules/setting";
import { ViewerActions } from "../modules/viewer";
import fileSelector from "../utils/fileSelector";

type Setting = SettingState & {
  fileLoader?: {
    dateFormat?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const FileLoader = memo(() => {
  const listRef = useRef<FlatList<FileProgram>>(null);
  const layoutCallbackId = useRef<number>();
  const count = useRef(0);

  const navigation = useNavigation();

  const dispatch = useDispatch();
  const programs = useSelector<State, FileProgram[]>(
    ({ file }) => file.programs
  );
  const dateFormat = useSelector<State, string>(
    ({ setting }) => setting.fileLoader?.dateFormat || ""
  );
  const commentChannels = useSelector<State, { id: string; type: string }[]>(
    ({ service }) => service.commentChannels,
    shallowEqual
  );
  const viewerPrograms = useSelector<State, FileProgram[]>(
    ({ viewer }) => viewer.programs,
    shallowEqual
  );
  const viewerIndex = useSelector<State, number>(({ viewer }) => viewer.index);
  const isOpened = useSelector<State, boolean>(({ viewer }) => viewer.isOpened);
  const playing = useSelector<State, boolean>(({ viewer }) => viewer.playing);

  const [containerWidth, setContainerWidth] = useState(0);

  const { theme } = useContext(ThemeContext);

  const selectedId = useMemo(() => viewerPrograms[viewerIndex]?.id, [
    viewerPrograms,
    viewerIndex
  ]);
  const itemDirection = useMemo(
    () => (containerWidth > breakpoint ? "row" : "column"),
    [containerWidth]
  );
  const extraData = useMemo(
    () => [commentChannels, selectedId, itemDirection],
    [commentChannels, selectedId, itemDirection]
  );

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );
  useEffect(() => {
    if (isOpened && !playing && programs[viewerIndex]?.id === selectedId) {
      dispatch(ViewerActions.open(programs, viewerIndex));
    }
    if (programs.length > count.current) {
      listRef.current?.scrollToEnd();
    }
    count.current = programs.length;
  }, [programs]);
  useEffect(() => {
    if (selectedId && listRef.current) {
      const index = programs.findIndex(({ id }) => id === selectedId);
      if (index >= 0) {
        listRef.current.scrollToIndex({ index, viewPosition: 0.5 });
      }
    }
  }, [selectedId]);

  const onLayout = useCallback(({ nativeEvent }) => {
    if (layoutCallbackId.current != null) {
      clearTimeout(layoutCallbackId.current);
    }
    const { layout } = nativeEvent;
    const containerWidth = layout.width;
    layoutCallbackId.current = setTimeout(() => {
      setContainerWidth(containerWidth);
    }, 200);
  }, []);
  const back = useCallback(() => {
    navigation.goBack();
  }, []);
  const dateFormatChange = useCallback((dateFormat: string) => {
    dispatch(SettingActions.update("fileLoader", { dateFormat }));
  }, []);
  const selectFile = useCallback(async () => {
    const uris = await fileSelector({
      multiSelections: true,
      type: Platform.select({
        web: [
          {
            name: "Movies",
            extensions: ["mp4", "mkv", "m2ts", "ts"]
          },
          { name: "All", extensions: ["*"] }
        ],
        default: [DocumentPicker.types.video, DocumentPicker.types.allFiles]
      })
    });
    if (uris) {
      dispatch(FileActions.add(uris));
    }
  }, []);
  const onItemDateChange = useCallback(({ id }: FileProgram, date: Date) => {
    dispatch(FileActions.update(id, { start: date, end: date }));
  }, []);
  const onItemChannelChange = useCallback(
    ({ id }: FileProgram, value: string) => {
      const { id: channelId } = commentChannels.find(
        ({ id }) => id === value
      ) || {
        id: "",
        type: ""
      };
      dispatch(
        FileActions.update(id, {
          channel: value,
          channelName: channelId
        })
      );
    },
    [commentChannels]
  );
  const onItemRemove = useCallback(({ id }: FileProgram) => {
    dispatch(FileActions.remove(id));
  }, []);
  const onItemPlay = useCallback(
    ({ id }: FileProgram) => {
      const index = programs.findIndex(a => a.id === id);
      dispatch(ViewerActions.open(programs, index));
    },
    [programs]
  );
  const keyExtractor = useCallback(({ id }) => id, []);
  const listRenderer: ListRenderItem<FileProgram> = useCallback(
    ({ item }) => (
      <ListProgram
        selected={item.id === selectedId}
        direction={itemDirection}
        channels={commentChannels}
        onDateChange={onItemDateChange}
        onChannelChange={onItemChannelChange}
        onRemove={onItemRemove}
        onPlay={onItemPlay}
        {...item}
      />
    ),
    [
      selectedId,
      itemDirection,
      commentChannels,
      onItemDateChange,
      onItemChannelChange,
      onItemRemove,
      onItemPlay
    ]
  );

  return (
    <View style={[containerStyle.container]} onLayout={onLayout}>
      <View
        style={[
          containerStyle.row,
          containerStyle.nowrap,
          { backgroundColor: theme.colors?.controlBg }
        ]}
      >
        <TouchableOpacity style={styles.button} onPress={back}>
          <FontAwesome5Icon
            name="chevron-circle-left"
            solid
            size={24}
            color={theme.colors?.control}
          />
        </TouchableOpacity>
        <Text h2 style={[{ color: theme.colors?.control }]}>
          ファイル再生
        </Text>
      </View>
      <View
        style={[styles.view, { backgroundColor: theme.colors?.background }]}
      >
        <Text h3 style={[textStyle.center]}>
          プレイリスト
        </Text>
        <FlatList
          data={programs}
          extraData={extraData}
          ref={listRef}
          keyExtractor={keyExtractor}
          renderItem={listRenderer}
        />
        <View style={[containerStyle.row, containerStyle.center]}>
          <TouchableOpacity style={styles.button} onPress={selectFile}>
            <FontAwesome5Icon
              name="plus"
              solid
              color={theme.colors?.default}
              size={24}
            />
          </TouchableOpacity>
        </View>
        <View
          style={[
            containerStyle.row,
            containerStyle.right,
            containerStyle.wrap
          ]}
        >
          <Text>日時取得フォーマット</Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors?.background,
                borderColor: theme.colors?.border
              }
            ]}
          >
            <TextInput
              style={[styles.input]}
              placeholder="YYMMDDHHmm"
              value={dateFormat}
              onChangeText={dateFormatChange}
            />
          </View>
        </View>
      </View>
    </View>
  );
});
export default FileLoader;

const ListProgram = memo(
  ({
    selected = true,
    direction = "column",
    channels,
    onDateChange,
    onChannelChange,
    onPlay,
    onRemove,
    ...props
  }: FileProgram & {
    selected?: boolean;
    direction?: "row" | "column";
    channels: { id: string; type: string }[];
    onDateChange?: (program: FileProgram, date: Date) => void;
    onChannelChange?: (program: FileProgram, channel: string) => void;
    onRemove?: (program: FileProgram) => void;
    onPlay?: (program: FileProgram) => void;
  }) => {
    const { title, channelName, start } = props;

    const { theme } = useContext(ThemeContext);

    const channelItems = useMemo(
      () => [
        { label: "チャンネル未設定", value: "" },
        ...channels.map(({ id }) => ({
          label: id,
          value: id
        }))
      ],
      [channels]
    );

    const dateChange = useCallback(
      (date: Date) => {
        if (onDateChange) {
          onDateChange(props, date);
        }
      },
      [props, onDateChange]
    );
    const channelChange = useCallback(
      (channel: ReactText) => {
        if (onChannelChange) {
          onChannelChange(props, channel.toString());
        }
      },
      [props, onChannelChange]
    );
    const onRemovePress = useCallback(() => {
      if (onRemove) {
        onRemove(props);
      }
    }, [props, onRemove]);
    const onPlayPress = useCallback(() => {
      if (onPlay) {
        onPlay(props);
      }
    }, [props, onPlay]);

    return (
      <ListItem
        containerStyle={[
          selected && { backgroundColor: theme.colors?.selected }
        ]}
        bottomDivider
      >
        <ListItem.Content>
          <ListItem.Title>{title}</ListItem.Title>
          <ListItem.Subtitle>
            <View
              style={[
                direction === "row" && containerStyle.row,
                direction === "column" && containerStyle.column,
                styles.row
              ]}
            >
              <View
                style={[
                  styles.inputWrapper,
                  { borderColor: theme.colors?.border }
                ]}
              >
                <DatePicker
                  color={theme.colors?.default}
                  backgroundColor={theme.colors?.background}
                  value={start}
                  onChange={dateChange}
                />
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  { borderColor: theme.colors?.border }
                ]}
              >
                <TimePicker
                  color={theme.colors?.default}
                  backgroundColor={theme.colors?.background}
                  value={start}
                  onChange={dateChange}
                />
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.colors?.background,
                    borderColor: theme.colors?.border
                  }
                ]}
              >
                <IconSelector
                  icon={
                    <FontAwesome5Icon
                      name="tv"
                      solid
                      color={theme.colors?.default}
                    />
                  }
                  containerStyle={[
                    { backgroundColor: theme.colors?.background }
                  ]}
                  itemStyle={[styles.input]}
                  style={[{ backgroundColor: theme.colors?.background }]}
                  color={theme.colors?.default}
                  items={channelItems}
                  selectedValue={channelName}
                  onValueChange={channelChange}
                />
              </View>
            </View>
            <View style={[containerStyle.row, styles.row]}>
              <TouchableOpacity style={[styles.button]} onPress={onRemovePress}>
                <FontAwesome5Icon
                  name="minus"
                  solid
                  size={24}
                  color={theme.colors?.default}
                />
              </TouchableOpacity>
              <View style={styles.spacer} />
              <TouchableOpacity style={[styles.button]} onPress={onPlayPress}>
                <FontAwesome5Icon
                  name="play"
                  solid
                  size={24}
                  color={theme.colors?.default}
                />
              </TouchableOpacity>
            </View>
          </ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
    );
  }
);

const breakpoint = 600;

const styles = StyleSheet.create({
  title: {
    flex: 1,
    height: 40,
    lineHeight: 40,
    marginHorizontal: 16,
    overflow: "hidden"
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  view: {
    flex: 1
  },
  row: {
    width: "100%"
  },
  spacer: {
    flex: 1
  },
  inputWrapper: {
    borderWidth: 1,
    minWidth: 180
  },
  input: {
    borderWidth: 0,
    fontSize: 16
  }
});
