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
  useRef,
  ReactText
} from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  ListRenderItem,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent
} from "react-native";
import { Picker } from "@react-native-community/picker";
import { Badge, ListItem, Text, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector } from "react-redux";

import Balloon from "../components/Balloon";
import IconSelector from "../components/IconSelector";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import programStyle from "../styles/program";
import { RootState } from "../modules";
import {
  ProgramActions,
  ProgramState,
  ProgramListData,
  ProgramListProgram
} from "../modules/program";
import { SettingActions, SettingState } from "../modules/setting";
import { ViewerActions } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";

type Options = {
  view?: string;
  reverse?: boolean;
};
type Setting = SettingState & {
  listOptions?: Options;
  useArchive?: boolean;
  view?: {
    countMode?: string;
    hourFirst?: string;
    hourFormat?: string;
  };
};
type State = RootState & {
  program: ProgramState & {
    list: ProgramListData;
  };
  setting: Setting;
};

function save(options: Options) {
  return SettingActions.update("listOptions", options);
}
function setPage(page: number) {
  return ProgramActions.update("list", { page });
}
function open(programs: ProgramListProgram[], index: number) {
  return ViewerActions.open(programs, index);
}

const ProgramList = memo(() => {
  const listRef = useRef<FlatList<ProgramListProgram>>(null);
  const layoutCallbackId = useRef<number>();
  const scrollPos = useRef(0);
  const headerHeightRef = useRef(256);
  const headerHeight = useRef(new Animated.Value(headerHeightRef.current))
    .current;
  const viewX = useRef(new Animated.Value(0)).current;

  const dispatch = useDispatch();
  const useArchive = useSelector<State, boolean>(
    ({ setting }) => setting.useArchive == null || setting.useArchive
  );
  const countMode = useSelector<State, string>(
    ({ setting }) => setting.view?.countMode || "speed"
  );
  const hourFirst = useSelector<State, number>(({ setting }) =>
    parseInt(setting.view?.hourFirst || "4", 10)
  );
  const hourFormat = useSelector<State, string>(
    ({ setting }) => setting.view?.hourFormat || ""
  );
  const view = useSelector<State, number>(({ setting }) =>
    parseInt(setting.listOptions?.view || "25", 10)
  );
  const reverse = useSelector<State, number>(
    ({ setting }) =>
      setting.listOptions?.reverse == null || setting.listOptions?.reverse
  );
  const hits = useSelector<State, number>(
    ({ program }) => program.list?.hits || 0
  );
  const page = useSelector<State, number>(
    ({ program }) => program.list?.page || 1
  );
  const programs = useSelector<State, ProgramListProgram[]>(
    ({ program }) => program.list?.programs || []
  );
  const query = useSelector<State, string>(
    ({ program }) => program.list?.query || ""
  );
  const archiveActive = useSelector<State, SettingState>(
    ({ service }) => service.archiveActive
  );
  const selectedId = useSelector<State, string | undefined>(
    ({ viewer }) => viewer.programs[viewer.index]?.id
  );

  const [containerWidth, setContainerWidth] = useState(0);

  const { theme } = useContext(ThemeContext);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: ({}, { vx, vy }) =>
          Math.abs(vx) > Math.abs(vy),
        onMoveShouldSetPanResponder: ({}, { vx, vy }) =>
          Math.abs(vx) > Math.abs(vy),
        onPanResponderMove: Animated.event([null, { dx: viewX }], {
          useNativeDriver: false
        }),
        onPanResponderEnd: ({}, { dx }) => {
          if (Math.abs(dx) > 64) {
            const p = page - Math.sign(dx);
            if (p < 1) {
              viewX.setValue(0);
            } else {
              const max = Math.ceil(hits / view);
              if (p > max) {
                viewX.setValue(0);
              } else {
                Animated.timing(viewX, {
                  toValue: Math.sign(dx) * containerWidth,
                  useNativeDriver: Platform.OS !== "web"
                }).start(() => {
                  dispatch(setPage(p));
                });
              }
            }
          } else {
            viewX.setValue(0);
          }
        }
      }),
    [hits, page, view, containerWidth]
  );
  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );
  const startIndex = useMemo(() => (page - 1) * view + 1, [page, view]);
  const endIndex = useMemo(() => {
    let endIndex = page * view;
    if (endIndex > hits) {
      endIndex = hits;
    }
    return endIndex;
  }, [hits, page, view]);
  const pageCount = useMemo(() => Math.ceil(hits / view), [hits, view]);
  const pages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < pageCount; i++) {
      pages.push(i + 1);
    }
    return pages;
  }, [view, reverse, hits]);

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );
  useEffect(() => {
    dispatch(ProgramActions.load("list"));
    viewX.setValue(0);
  }, [useArchive, view, reverse, page, query]);
  useEffect(() => {
    dispatch(setPage(1));
  }, [useArchive, view, reverse, query]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "up";
      Mousetrap.bind(key, () => {
        if (selectedId) {
          const index = programs.findIndex(({ id }) => id === selectedId);
          if (index >= 0) {
            if (programs[index - 1]) {
              dispatch(open(programs, index - 1));
            }
            return false;
          }
        }
        if (programs[0]) {
          dispatch(open(programs, 0));
          return false;
        }
        return true;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [programs, selectedId]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "down";
      Mousetrap.bind(key, () => {
        if (selectedId) {
          const index = programs.findIndex(({ id }) => id === selectedId);
          if (index >= 0) {
            if (programs[index + 1]) {
              dispatch(open(programs, index + 1));
            }
            return false;
          }
        }
        if (programs[0]) {
          dispatch(open(programs, 0));
          return false;
        }
        return true;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [programs, selectedId]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "left";
      Mousetrap.bind(key, () => {
        const p = page - 1;
        if (p > 0) {
          dispatch(setPage(p));
          return false;
        }
        return true;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [page]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "right";
      Mousetrap.bind(key, () => {
        const p = page + 1;
        if (p <= pageCount) {
          dispatch(setPage(p));
          return false;
        }
        return true;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [page, pageCount]);
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [page]);
  useEffect(() => {
    if (selectedId && listRef.current) {
      const index = programs.findIndex(({ id }) => id === selectedId);
      if (index >= 0) {
        listRef.current.scrollToIndex({ index, viewPosition: 0.5 });
      }
    }
  }, [selectedId]);

  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    if (layoutCallbackId.current != null) {
      clearTimeout(layoutCallbackId.current);
    }
    const { layout } = nativeEvent;
    const containerWidth = layout.width;
    layoutCallbackId.current = setTimeout(() => {
      setContainerWidth(containerWidth);
    }, 200);
  }, []);
  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      const scrollDiff = contentOffset.y - scrollPos.current;
      headerHeightRef.current -= scrollDiff;
      if (contentOffset.y <= 0) {
        headerHeightRef.current = 256;
      }
      if (contentOffset.y >= contentSize.height - layoutMeasurement.height) {
        headerHeightRef.current = 0;
      }
      if (headerHeightRef.current > 256) {
        headerHeightRef.current = 256;
      } else if (headerHeightRef.current < 0) {
        headerHeightRef.current = 0;
      }
      headerHeight.setValue(headerHeightRef.current);
      scrollPos.current = contentOffset.y;
    },
    []
  );
  const useArchiveChange = useCallback((value: string | number) => {
    dispatch(SettingActions.update("useArchive", value > 0));
  }, []);
  const reverseChange = useCallback((value: string | number) => {
    dispatch(save({ reverse: value > 0 }));
  }, []);
  const viewChange = useCallback((view: string | number) => {
    dispatch(save({ view: String(view) }));
  }, []);
  const pageChange = useCallback(
    (value: ReactText) => {
      const p = parseInt(value as string, 10);
      if (p !== page && p > 0 && p <= pageCount) {
        dispatch(setPage(p));
      }
    },
    [page, pageCount]
  );
  const previousPage = useCallback(() => {
    const p = page - 1;
    if (p > 0) {
      dispatch(setPage(p));
    }
  }, [page]);
  const nextPage = useCallback(() => {
    const p = page + 1;
    if (p <= pageCount) {
      dispatch(setPage(p));
    }
  }, [page, pageCount]);
  const firstPage = useCallback(() => {
    if (page !== 1) {
      dispatch(setPage(1));
    }
  }, [page]);
  const lastPage = useCallback(() => {
    if (page !== pageCount) {
      dispatch(setPage(pageCount));
    }
  }, [page, pageCount]);
  const onItemPress = useCallback(
    ({ id }: ProgramListProgram) => {
      const index = programs.findIndex(a => a.id === id);
      dispatch(open(programs, index));
    },
    [programs]
  );
  const keyExtractor = useCallback(({ id }: ProgramListProgram) => id, []);
  const listDateFormatter = useCallback(
    (date: Date) => dateFormatter.format(date, "YYYY/MM/DD(dd) A HHHH:mm"),
    [dateFormatter]
  );
  const listRenderer = useCallback<ListRenderItem<ProgramListProgram>>(
    ({ item }) => (
      <ListProgram
        selected={item.id === selectedId}
        countMode={countMode}
        dateFormatter={listDateFormatter}
        onPress={onItemPress}
        {...item}
      />
    ),
    [countMode, selectedId, listDateFormatter, onItemPress]
  );
  const pagePickerRenderer = useCallback(
    (page: number) => (
      <Picker.Item key={page} label={String(page)} value={String(page)} />
    ),
    []
  );

  return (
    <View style={[containerStyle.container]} onLayout={onLayout}>
      {containerWidth > 0 && (
        <Animated.View
          style={[
            containerWidth > breakpoint
              ? containerStyle.row
              : containerStyle.column,
            styles.header,
            {
              backgroundColor: theme.colors?.controlBgActive,
              maxHeight: headerHeight
            }
          ]}
        >
          <View
            style={
              containerWidth > breakpoint
                ? [
                    containerStyle.row,
                    containerStyle.wrap,
                    containerStyle.left,
                    programStyle.headerColumn
                  ]
                : programStyle.headerRow
            }
          >
            {archiveActive && (
              <IconSelector
                containerStyle={[
                  programStyle.headerControl,
                  {
                    backgroundColor: theme.colors?.controlBg,
                    borderColor: theme.colors?.controlBorder
                  }
                ]}
                style={[{ backgroundColor: theme.colors?.controlBg }]}
                color={theme.colors?.control}
                icon={
                  <FontAwesome5Icon
                    name="database"
                    solid
                    color={theme.colors?.control}
                  />
                }
                selectedValue={useArchive ? 1 : 0}
                onValueChange={useArchiveChange}
                items={[
                  { label: "番組表", value: 1 },
                  { label: "録画情報", value: 0 }
                ]}
              />
            )}
            <IconSelector
              containerStyle={[
                programStyle.headerControl,
                {
                  backgroundColor: theme.colors?.controlBg,
                  borderColor: theme.colors?.controlBorder
                }
              ]}
              style={[{ backgroundColor: theme.colors?.controlBg }]}
              color={theme.colors?.control}
              icon={
                <FontAwesome5Icon
                  name="sort"
                  solid
                  color={theme.colors?.control}
                />
              }
              selectedValue={reverse ? 1 : 0}
              onValueChange={reverseChange}
              items={[
                { label: "放送日時(新しい順)", value: 1 },
                { label: "放送日時(古い順)", value: 0 }
              ]}
            />
          </View>
          <View
            style={
              containerWidth > breakpoint
                ? [
                    containerStyle.row,
                    containerStyle.wrap,
                    containerStyle.right,
                    programStyle.headerColumn,
                    programStyle.headerColumnReverse
                  ]
                : [programStyle.headerRow, programStyle.headerRowRevese]
            }
          >
            <View
              style={[
                containerStyle.row,
                containerStyle.right,
                programStyle.headerContent
              ]}
            >
              {hits > 0 && (
                <Text
                  style={[textStyle.right, { color: theme.colors?.control }]}
                >
                  {startIndex}-{endIndex}/{hits}
                </Text>
              )}
            </View>
            <IconSelector
              containerStyle={[
                programStyle.headerControl,
                {
                  backgroundColor: theme.colors?.controlBg,
                  borderColor: theme.colors?.controlBorder
                }
              ]}
              style={[{ backgroundColor: theme.colors?.controlBg }]}
              color={theme.colors?.control}
              icon={
                <FontAwesome5Icon
                  name="arrows-alt-v"
                  solid
                  color={theme.colors?.control}
                />
              }
              selectedValue={view}
              onValueChange={viewChange}
              items={[
                { label: "10件表示", value: 10 },
                { label: "25件表示", value: 25 },
                { label: "50件表示", value: 50 },
                { label: "100件表示", value: 100 }
              ]}
            />
          </View>
        </Animated.View>
      )}
      {containerWidth > 0 && (
        <Animated.View
          style={[styles.view, { transform: [{ translateX: viewX }] }]}
          {...panResponder.panHandlers}
        >
          <FlatList
            style={[programStyle.list]}
            contentContainerStyle={[programStyle.listContents]}
            data={programs}
            ref={listRef}
            keyExtractor={keyExtractor}
            renderItem={listRenderer}
            ListHeaderComponent={<ListHeader query={query} hits={hits} />}
            onScroll={onScroll}
          />
        </Animated.View>
      )}
      {containerWidth > 0 && pages.length > 1 && (
        <View style={[containerStyle.row, containerStyle.center, styles.pager]}>
          <TouchableOpacity onPress={firstPage}>
            <FontAwesome5Icon
              name="angle-double-left"
              solid
              style={styles.pageButton}
              color={theme.colors?.primary}
              size={16}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={previousPage}>
            <FontAwesome5Icon
              name="angle-left"
              solid
              style={styles.pageButton}
              color={theme.colors?.primary}
              size={16}
            />
          </TouchableOpacity>
          <View
            style={[
              styles.pagePickerWrapper,
              {
                backgroundColor: theme.colors?.background,
                borderColor: theme.colors?.divider
              },
              Platform.OS === "ios" && {
                borderWidth: 0,
                backgroundColor: "transparent",
                maxHeight: 96
              }
            ]}
          >
            <Picker
              style={[
                styles.pagePicker,
                {
                  backgroundColor: "transparent",
                  color: theme.colors?.default
                }
              ]}
              itemStyle={[
                styles.pagePickerItem,
                { color: theme.colors?.default }
              ]}
              selectedValue={String(page)}
              onValueChange={pageChange}
            >
              {pages.map(pagePickerRenderer)}
            </Picker>
          </View>
          <TouchableOpacity onPress={nextPage}>
            <FontAwesome5Icon
              name="angle-right"
              solid
              style={styles.pageButton}
              color={theme.colors?.primary}
              size={16}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={lastPage}>
            <FontAwesome5Icon
              name="angle-double-right"
              solid
              style={styles.pageButton}
              color={theme.colors?.primary}
              size={16}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
export default ProgramList;

const ListHeader = memo(({ query, hits }: { query?: string; hits: number }) =>
  query ? (
    <View style={programStyle.listHeader}>
      <Text h3>
        "{query}"の検索結果 ({hits}件)
      </Text>
    </View>
  ) : null
);
const ListProgram = memo(
  ({
    selected = false,
    countMode = "speed",
    dateFormatter = date => date.toString(),
    onPress,
    ...props
  }: ProgramListProgram & {
    selected?: boolean;
    countMode?: string;
    dateFormatter?: (date: Date) => string;
    onPress?: (program: ProgramListProgram) => void;
  }) => {
    const {
      channelName,
      fullTitle,
      category,
      duration,
      start,
      commentCount = 0,
      commentMaxSpeed = 0,
      commentSpeed = 0
    } = props;

    const { theme } = useContext(ThemeContext);

    const count = useMemo(() => {
      switch (countMode) {
        case "none":
          return 0;
        case "comment":
          return commentCount;
        case "maxspeed":
          return commentMaxSpeed;
        case "speed":
        default:
          return Math.ceil(commentSpeed * 10) / 10;
      }
    }, [countMode, commentCount, commentMaxSpeed, commentSpeed]);
    const balloonColor = useMemo(() => {
      if (commentSpeed > 200) {
        return "hsl(45, 100%, 50%)";
      }
      if (commentSpeed > 100) {
        return "hsl(50, 100%, 50%)";
      }
      if (commentSpeed > 50) {
        return "hsl(55, 100%, 50%)";
      }
      if (commentSpeed > 25) {
        return "hsl(60, 100%, 50%)";
      }
      if (commentSpeed > 10) {
        return "hsl(65, 100%, 50%)";
      }
      return "hsl(70, 100%, 50%)";
    }, [commentSpeed]);

    const onPressWithProps = useCallback(() => {
      if (onPress) {
        onPress(props);
      }
    }, [props, onPress]);

    return (
      <ListItem
        containerStyle={[
          selected && { backgroundColor: theme.colors?.selected }
        ]}
        bottomDivider
        onPress={onPressWithProps}
      >
        {count > 0 ? (
          <Balloon
            wrapperStyle={programStyle.listItemLeft}
            backgroundColor={balloonColor}
            pointing="right"
          >
            {count}
          </Balloon>
        ) : (
          <View style={programStyle.listItemLeft} />
        )}
        <ListItem.Content>
          <ListItem.Title>{fullTitle}</ListItem.Title>
          <ListItem.Subtitle>
            <Badge
              badgeStyle={[{ backgroundColor: category.color }]}
              value={category.name}
            />
            <Text> {channelName} </Text>
            <Text>
              {dateFormatter(start)}({Math.round(duration / 60000)}分)
            </Text>
          </ListItem.Subtitle>
        </ListItem.Content>
        <ListItem.Chevron color={theme.colors?.default} />
      </ListItem>
    );
  }
);

const breakpoint = 540;

const styles = StyleSheet.create({
  header: {
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  sortPicker: {
    minWidth: 240
  },
  view: {
    flex: 1
  },
  pager: {
    bottom: 0,
    height: 96,
    left: 0,
    position: "absolute",
    right: 0
  },
  pageButton: {
    height: 32,
    lineHeight: 32,
    marginLeft: 8,
    marginRight: 8,
    textAlign: "center",
    width: 32
  },
  pagePickerWrapper: {
    borderWidth: 1,
    maxHeight: 32,
    marginLeft: 8,
    marginRight: 8,
    minWidth: 120
  },
  pagePicker: {
    borderWidth: 0,
    flex: 1,
    maxHeight: 96
  },
  pagePickerItem: {
    fontSize: 16,
    maxHeight: 96
  }
});
