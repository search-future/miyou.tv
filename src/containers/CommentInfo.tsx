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
  FlatList,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  ListRenderItem
} from "react-native";
import { Text, CheckBox, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption
} from "react-native-popup-menu";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { RootState } from "../modules";
import { CommentPlayerActions, CommentData } from "../modules/commentPlayer";
import { PlayerActions } from "../modules/player";
import { SettingState, SettingActions } from "../modules/setting";
import DateFormatter from "../utils/DateFormatter";
import formatTime from "../utils/formatTime";
import CommentService from "../services/CommentService";

type Setting = SettingState & {
  queryTable?: { [channel: string]: string[] };
  view?: {
    hourFirst?: string;
    hourFormat?: string;
  };
};
type Anchor = {
  index: number;
  comment: CommentData;
};
type State = RootState & {
  setting: Setting;
};

const CommentInfo = memo(() => {
  const listRef = useRef<FlatList<CommentData>>(null);
  const updaterId = useRef<number>();
  const lastUpdate = useRef(0);

  const dispatch = useDispatch();
  const channel = useSelector<State, string>(
    ({ commentPlayer }) => commentPlayer.channel
  );
  const start = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.start
  );
  const data = useSelector<State, CommentData[]>(
    ({ commentPlayer }) => commentPlayer.data,
    shallowEqual
  );
  const pointer = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.pointer
  );
  const titles = useSelector<State, string[]>(
    ({ commentPlayer }) => commentPlayer.titles,
    shallowEqual
  );
  const filters = useSelector<State, string[]>(
    ({ commentPlayer }) => commentPlayer.filters,
    shallowEqual
  );
  const speed = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.speed,
    shallowEqual
  );
  const autoScroll = useSelector<State, boolean>(
    ({ commentPlayer }) => commentPlayer.autoScroll,
    shallowEqual
  );
  const commentChannels = useSelector<State, { id: string; type: string }[]>(
    ({ service }) => service.commentChannels,
    shallowEqual
  );
  const queryTable = useSelector<State, { [channel: string]: string[] }>(
    ({ setting }) => setting.queryTable || {},
    shallowEqual
  );
  const hourFirst = useSelector<State, number>(
    ({ setting }) => parseInt(setting.view?.hourFirst || "4", 10),
    shallowEqual
  );
  const hourFormat = useSelector<State, string>(
    ({ setting }) => setting.view?.hourFormat || "",
    shallowEqual
  );

  const { theme } = useContext(ThemeContext);

  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );
  const queries = useMemo(
    () => queryTable[channel] || [CommentService.normalizeChannel(channel)],
    [queryTable, channel]
  );
  const selectedChannels = useMemo(
    () => commentChannels.filter(({ id }) => queries.indexOf(id) >= 0),
    [commentChannels, queries]
  );
  const unselectedChannels = useMemo(
    () => commentChannels.filter(({ id }) => queries.indexOf(id) < 0),
    [commentChannels, queries]
  );
  const filteredData = useMemo(
    () => data.filter(({ title }) => filters.indexOf(title) >= 0),
    [data, filters]
  );

  useEffect(
    () => () => {
      clearTimeout(updaterId.current);
    },
    []
  );
  useEffect(() => {
    clearTimeout(updaterId.current);
    if (autoScroll) {
      const updater = () => {
        if (data[pointer]) {
          listRef.current?.scrollToIndex({ index: pointer, viewPosition: 1 });
        }
        lastUpdate.current = Date.now();
      };
      if (Date.now() - lastUpdate.current > maxUpdateInterval) {
        updater();
      } else {
        updaterId.current = setTimeout(updater, minUpdateInterval);
      }
    }
  }, [data, pointer, autoScroll]);

  const toggleAutoScroll = useCallback(() => {
    dispatch(CommentPlayerActions.setAutoScroll(!autoScroll));
  }, [autoScroll]);
  const onChannelPress = useCallback(
    (id: string, checked: boolean) => {
      if (checked) {
        queryTable[channel] = [...queries, id];
      } else {
        queryTable[channel] = queries.filter(a => a !== id);
      }
      dispatch(SettingActions.update("queryTable", queryTable));
    },
    [channel, queryTable, queries]
  );
  const channelRenderer = useCallback(
    ({ id }: { id: string }) => (
      <CustomCheckBox
        key={id}
        value={id}
        checked={queries.indexOf(id) >= 0}
        onPress={onChannelPress}
      />
    ),
    [queries, onChannelPress]
  );
  const onThreadPress = useCallback(
    (title: string, checked: boolean) => {
      if (checked) {
        dispatch(CommentPlayerActions.setFilters([...filters, title]));
      } else {
        dispatch(
          CommentPlayerActions.setFilters(filters.filter(a => a !== title))
        );
      }
    },
    [filters]
  );
  const threadRenderer = useCallback(
    (title: string) => (
      <CustomCheckBox
        key={title}
        value={title}
        checked={filters.indexOf(title) >= 0}
        onPress={onThreadPress}
      />
    ),
    [filters]
  );
  const getListItemLayout = useCallback(
    (data: CommentData[] | null | undefined, index: number) => ({
      index,
      length: 58,
      offset: index * 58
    }),
    []
  );
  const listDateFormatter = useCallback(
    (time: number) => dateFormatter.format(new Date(time), "HHHH:mm:ss"),
    [dateFormatter]
  );
  const onListSelect = useCallback(
    ({ time }: CommentData) => {
      dispatch(PlayerActions.time(time - start));
    },
    [start]
  );
  const listRenderer = useCallback<ListRenderItem<CommentData>>(
    ({ item }) => (
      <CommentListItem
        {...item}
        offset={start}
        list={data}
        dateFormatter={listDateFormatter}
        onSelect={onListSelect}
      />
    ),
    [data, start, listDateFormatter, onListSelect]
  );

  return (
    <>
      <View style={containerStyle.row}>
        <Menu>
          <MenuTrigger
            customStyles={{
              triggerWrapper: [
                containerStyle.row,
                styles.menuButton,
                {
                  backgroundColor: theme.colors?.controlBg,
                  borderColor: theme.colors?.controlBorder
                }
              ]
            }}
          >
            <Text
              style={[styles.menuButtonText, { color: theme.colors?.control }]}
            >
              チャンネル
            </Text>
            <View style={styles.menuButtonIcon}>
              <FontAwesome5Icon
                name="caret-down"
                solid
                color={theme.colors?.control}
              />
            </View>
          </MenuTrigger>
          <MenuOptions
            customStyles={{
              optionsContainer: [
                styles.menuContainer,
                { backgroundColor: theme.colors?.controlBgActive }
              ]
            }}
          >
            <ScrollView style={styles.menuView}>
              {selectedChannels.map(channelRenderer)}
              {unselectedChannels.map(channelRenderer)}
            </ScrollView>
          </MenuOptions>
        </Menu>
        <Menu>
          <MenuTrigger
            customStyles={{
              triggerWrapper: [
                containerStyle.row,
                styles.menuButton,
                {
                  backgroundColor: theme.colors?.controlBg,
                  borderColor: theme.colors?.controlBorder
                }
              ]
            }}
          >
            <Text
              style={[styles.menuButtonText, { color: theme.colors?.control }]}
            >
              スレッド
            </Text>
            <View style={styles.menuButtonIcon}>
              <FontAwesome5Icon
                name="caret-down"
                solid
                color={theme.colors?.control}
              />
            </View>
          </MenuTrigger>
          <MenuOptions
            customStyles={{ optionsContainer: [styles.menuContainer] }}
          >
            <ScrollView style={styles.menuView}>
              {titles.map(threadRenderer)}
            </ScrollView>
          </MenuOptions>
        </Menu>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.button} onPress={toggleAutoScroll}>
          <FontAwesome5Icon
            name="sort-amount-down"
            solid
            color={autoScroll ? theme.colors?.primary : theme.colors?.control}
            size={16}
          />
        </TouchableOpacity>
      </View>
      <FlatList
        style={[
          containerStyle.container,
          styles.list,
          {
            backgroundColor: theme.colors?.controlBgActive,
            borderColor: theme.colors?.controlBorder
          }
        ]}
        data={filteredData}
        removeClippedSubviews={Platform.OS !== "web"}
        windowSize={3}
        ref={listRef}
        keyExtractor={({ id }) => id}
        getItemLayout={getListItemLayout}
        renderItem={listRenderer}
      />
      <View style={[containerStyle.row, styles.footer]}>
        <Text
          style={[containerStyle.container, { color: theme.colors?.control }]}
        >
          {CommentService.channelToQueries(channel, queryTable).join(",")}
        </Text>
        <Text style={[textStyle.right, { color: theme.colors?.control }]}>
          {speed}コメント/分
        </Text>
      </View>
    </>
  );
});
export default CommentInfo;

const CustomCheckBox = memo(
  ({
    value,
    checked = false,
    onPress
  }: {
    value: string;
    checked?: boolean;
    onPress?: (value: string, checked: boolean) => void;
  }) => {
    const { theme } = useContext(ThemeContext);

    const onPressHandler = useCallback(() => {
      if (onPress) {
        onPress(value, !checked);
      }
    }, [value, checked, onPress]);
    return (
      <CheckBox
        containerStyle={[
          styles.menuCheckbox,
          {
            backgroundColor: theme.colors?.controlBgActive,
            borderColor: theme.colors?.controlBorder
          }
        ]}
        textStyle={[{ color: theme.colors?.control }]}
        title={value}
        checked={checked}
        onPress={onPressHandler}
      />
    );
  }
);

const CommentListItem = memo(
  ({
    offset,
    list,
    dateFormatter = date => new Date(date).toTimeString(),
    onSelect,
    ...props
  }: CommentData & {
    offset: number;
    list: CommentData[];
    dateFormatter: (time: number) => string;
    onSelect?: (data: CommentData) => void;
  }) => {
    const { title, name, email, text, time, id } = props;

    const { theme } = useContext(ThemeContext);

    const [anchors, setAnchors] = useState<Anchor[]>([]);
    const [anchorIndex, setAnchorIndex] = useState<number>(-1);

    const playTime = useMemo(() => formatTime(time - offset), [time, offset]);
    const airTime = useMemo(() => dateFormatter(time), [time, dateFormatter]);
    const anchorComment = useMemo(
      () =>
        anchorIndex > 0
          ? anchors.find(({ index }) => index === anchorIndex)?.comment
          : anchors[0]?.comment,
      [anchors, anchorIndex]
    );

    const onOpen = useCallback(() => {
      const pattern = />>([0-9]{1,4})([,-][0-9]{1,4})*/g;
      const [board, thread] = id.split("/");
      const anchors: Anchor[] = [];
      const matches = text.match(pattern);
      if (matches) {
        let match;
        while ((match = matches.shift())) {
          const dests = match.replace(">>", "").split(",");
          for (const dest of dests) {
            const [left, right] = dest.split("-");
            const start = parseInt(left > right ? right : left, 10);
            const end = parseInt(left < right ? right : left, 10);
            for (let i = start; i <= end; i++) {
              const searchId = [
                board,
                thread,
                String(i + 10000).slice(-4)
              ].join("/");
              const comment = list.find(a => a.id === searchId);
              if (comment && !anchors.some(({ index }) => index === i)) {
                anchors.push({ index: i, comment });
                const more = comment.text.match(pattern);
                if (more) {
                  matches.push(...more);
                }
              }
            }
          }
        }
      }
      setAnchors(anchors);
    }, [text, id]);
    const onSelectHandler = useCallback(() => {
      if (onSelect) {
        onSelect(props);
      }
    }, [props, onSelect]);
    const anchorRenderer = useCallback(
      ({ index, comment }) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.anchorButton,
            {
              backgroundColor:
                comment === anchorComment
                  ? theme.colors?.selected
                  : theme.colors?.background,
              borderColor: theme.colors?.border
            }
          ]}
          onPress={() => {
            setAnchorIndex(index);
          }}
        >
          <Text>{`>>${index}`}</Text>
        </TouchableOpacity>
      ),
      [anchorComment]
    );
    const onAnchorCommentSelect = useCallback(() => {
      if (onSelect && anchorComment) {
        onSelect(anchorComment);
      }
    }, [onSelect, anchorComment]);

    return (
      <Menu onOpen={onOpen}>
        <MenuTrigger
          customStyles={{
            triggerWrapper: [
              styles.item,
              {
                backgroundColor: theme.colors?.background,
                borderColor: theme.colors?.divider
              }
            ]
          }}
        >
          <Text style={[styles.itemTextSmall]}>
            {playTime}({airTime}) {name}[{email}](
            {id})
          </Text>
          <Text style={[textStyle.bold, styles.itemText]}>{text.trim()}</Text>
          <Text style={[styles.itemTextSmall]}>{title}</Text>
        </MenuTrigger>
        <MenuOptions
          customStyles={{
            optionsContainer: [
              styles.itemMenuContainer,
              {
                backgroundColor: theme.colors?.background,
                borderColor: theme.colors?.divider
              }
            ]
          }}
        >
          <MenuOption
            style={[
              containerStyle.row,
              { backgroundColor: theme.colors?.controlBgActive }
            ]}
            onSelect={onSelectHandler}
          >
            <View style={styles.itemMenuIcon}>
              <FontAwesome5Icon
                name="clock"
                solid
                color={theme.colors?.control}
                size={16}
              />
            </View>
            <Text
              style={[
                styles.itemMenuTitle,
                {
                  color: theme.colors?.control
                }
              ]}
            >
              {playTime}({airTime})
            </Text>
          </MenuOption>
          <Text style={[textStyle.bold, styles.itemMenuContent]}>
            {text.trim()}
          </Text>
          <View style={containerStyle.row}>
            <Text style={[styles.itemMenuName]}>スレッド</Text>
            <Text style={[styles.itemMenuText]}>{title}</Text>
          </View>
          <View style={containerStyle.row}>
            <Text style={[styles.itemMenuName]}>名前</Text>
            <Text style={[styles.itemMenuText]}>{name}</Text>
          </View>
          <View style={containerStyle.row}>
            <Text style={[styles.itemMenuName]}>メール</Text>
            <Text style={[styles.itemMenuText]}>{email}</Text>
          </View>
          <View style={containerStyle.row}>
            <Text style={[styles.itemMenuName]}>ID</Text>
            <Text style={[styles.itemMenuText]}>{id}</Text>
          </View>
          {anchors.length > 0 && (
            <View style={[containerStyle.row, containerStyle.wrap]}>
              {anchors.map(anchorRenderer)}
            </View>
          )}
          {anchorComment && (
            <TouchableOpacity
              style={[
                styles.anchorContent,
                { borderColor: theme.colors?.border }
              ]}
              onPress={onAnchorCommentSelect}
            >
              <Text style={[styles.itemMenuText]}>
                {dateFormatter(anchorComment.time)} {anchorComment.name}[
                {anchorComment.email}]({anchorComment.id})
              </Text>
              <Text style={[textStyle.bold, styles.itemMenuContent]}>
                {anchorComment.text.trim()}
              </Text>
            </TouchableOpacity>
          )}
        </MenuOptions>
      </Menu>
    );
  }
);

const minUpdateInterval = 1000;
const maxUpdateInterval = 5000;
const textNowrap = Platform.OS === "web" ? { whiteSpace: "nowrap" } : {};

const styles = StyleSheet.create({
  spacer: {
    flex: 1
  },
  menuButton: {
    borderWidth: 1,
    height: 32,
    paddingHorizontal: 4,
    margin: 4
  },
  menuButtonText: {
    lineHeight: 32,
    marginHorizontal: 4
  },
  menuButtonIcon: {
    alignItems: "center",
    flexDirection: "row",
    height: 32,
    justifyContent: "center",
    width: 16
  },
  menuContainer: {
    width: 240
  },
  menuView: {
    maxHeight: 240
  },
  menuCheckbox: {
    borderRadius: 0,
    margin: 0,
    marginLeft: 0,
    marginRight: 0
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  list: {
    borderBottomWidth: 1,
    borderTopWidth: 1
  },
  item: {
    borderBottomWidth: 1,
    height: 58
  },
  itemText: {
    fontSize: 14,
    height: 21,
    lineHeight: 21,
    ...textNowrap
  },
  itemTextSmall: {
    fontSize: 12,
    height: 18,
    lineHeight: 18,
    ...textNowrap
  },
  itemMenuContainer: {
    borderWidth: 1,
    width: 320
  },
  itemMenuIcon: {
    alignItems: "center",
    flexDirection: "row",
    height: 24,
    justifyContent: "center",
    width: 24
  },
  itemMenuTitle: {
    fontSize: 16,
    lineHeight: 24,
    marginHorizontal: 4
  },
  itemMenuContent: {
    fontSize: 14,
    lineHeight: 21,
    marginHorizontal: 4
  },
  itemMenuName: {
    alignSelf: "flex-start",
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 4,
    width: 48
  },
  itemMenuText: {
    alignSelf: "flex-start",
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 4
  },
  anchorButton: {
    borderWidth: 1,
    margin: 4
  },
  anchorContent: {
    borderTopWidth: 1
  },
  footer: {
    padding: 8
  }
});
