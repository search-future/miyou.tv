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
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent
} from "react-native";
import { Badge, CheckBox, Text, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { Menu, MenuTrigger, MenuOptions } from "react-native-popup-menu";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import Balloon from "../components/Balloon";
import DatePicker from "../components/DatePicker";
import IconSelector from "../components/IconSelector";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import programStyle from "../styles/program";
import { RootState } from "../modules";
import {
  ProgramActions,
  ProgramState,
  ProgramTableData,
  ProgramTableProgram,
  ProgramTableColumn
} from "../modules/program";
import { SettingActions, SettingState } from "../modules/setting";
import { ViewerActions, ViewerProgram } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";
import { categoryTable } from "../config/constants";

type Options = {
  categories?: string[];
};
type Setting = SettingState & {
  tableOptions?: Options;
  view?: {
    countMode?: string;
    hourFirst?: string;
    hourFormat?: string;
  };
  useArchive?: boolean;
};
type State = RootState & {
  program: ProgramState & { table: ProgramTableData };
  setting: Setting;
};

function save(options: Options = {}) {
  return SettingActions.update("tableOptions", options);
}
function setOffset(offset: number) {
  return ProgramActions.update("table", { offset });
}
function setStart(start: Date) {
  return ProgramActions.update("table", { start });
}
function open(programs: ProgramTableProgram[], index: number) {
  return ViewerActions.open(programs, index);
}
function roundOffset(offset: number, max: number) {
  return ((offset % max) + max) % max;
}

const ProgramTable = memo(() => {
  const viewRef = useRef<ScrollView>(null);
  const layoutCallbackId = useRef<number>();
  const scrollPos = useRef(0);
  const headerHeightRef = useRef(256);
  const headerHeight = useRef(new Animated.Value(headerHeightRef.current))
    .current;
  const viewX = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation();

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
  const categories = useSelector<State, string[]>(
    ({ setting }) => setting.tableOptions?.categories || [],
    shallowEqual
  );
  const columns = useSelector<State, ProgramTableColumn[]>(
    ({ program }) => program.table?.columns || []
  );
  const maxDate = useSelector<State, Date | undefined>(
    ({ program }) => program.table?.maxDate
  );
  const minDate = useSelector<State, Date | undefined>(
    ({ program }) => program.table?.minDate
  );
  const offset = useSelector<State, number>(
    ({ program }) => program.table?.offset || 0
  );
  const start = useSelector<State, Date>(
    ({ program }) => program.table?.start || new Date()
  );
  const archiveActive = useSelector<State, boolean>(
    ({ service }) => service.archiveActive
  );
  const viewerProgram = useSelector<State, ViewerProgram | undefined>(
    ({ viewer }) => viewer.programs[viewer.index],
    shallowEqual
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const [isTop, setTop] = useState(true);
  const [isBottom, setBottom] = useState(false);

  const { theme } = useContext(ThemeContext);

  const selectedId = viewerProgram?.id;

  const panResponder = useMemo(() => {
    const contentWidth = containerWidth - hourWidth - scrollbarWidth;
    const columnWidth = contentWidth / Math.floor(contentWidth / 200);

    return PanResponder.create({
      onStartShouldSetPanResponder: ({}, { vx, vy }) =>
        Math.abs(vx) > Math.abs(vy),
      onMoveShouldSetPanResponder: ({}, { vx, vy }) =>
        Math.abs(vx) > Math.abs(vy),
      onPanResponderMove: Animated.event([null, { dx: viewX }], {
        useNativeDriver: false
      }),
      onPanResponderEnd: ({}, { dx }) => {
        if (Math.abs(dx) > columnWidth) {
          const length = Math.round(dx / columnWidth);
          const nextOffset = Math.floor(offset - length);
          Animated.timing(viewX, {
            toValue: length * columnWidth,
            useNativeDriver: Platform.OS !== "web"
          }).start(() => {
            dispatch(setOffset(roundOffset(nextOffset, columns.length)));
            viewX.setValue(0);
          });
        } else if (Math.abs(dx) > 64) {
          Animated.timing(viewX, {
            toValue: Math.sign(dx) * columnWidth,
            useNativeDriver: Platform.OS !== "web"
          }).start(() => {
            dispatch(
              setOffset(roundOffset(offset - Math.sign(dx), columns.length))
            );
            viewX.setValue(0);
          });
        } else {
          viewX.setValue(0);
        }
      }
    });
  }, [offset, containerWidth, columns.length]);
  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );
  const tableColumns = useMemo(() => {
    const columnCount = Math.floor(
      (containerWidth - hourWidth - scrollbarWidth) / 200
    );
    const tableColumns = [];
    for (let i = 0; i < columns.length; i++) {
      const column = columns[roundOffset(offset + i, columns.length)];
      tableColumns.push({
        ...column,
        programs: column.programs.filter(
          ({ category }: ProgramTableProgram) =>
            categories.length < 1 ||
            categories.indexOf(String(category.code)) >= 0
        )
      });
      if (tableColumns.length >= columnCount) {
        break;
      }
    }
    return tableColumns;
  }, [categories, columns, offset, containerWidth]);
  const hasPrevious = useMemo(
    () =>
      !minDate ||
      start.getFullYear() > minDate.getFullYear() ||
      start.getMonth() > minDate.getMonth() ||
      start.getDate() > minDate.getDate(),
    [minDate, start.toDateString()]
  );
  const hasNext = useMemo(
    () =>
      !maxDate ||
      start.getFullYear() < maxDate.getFullYear() ||
      start.getMonth() < maxDate.getMonth() ||
      start.getDate() < maxDate.getDate(),
    [maxDate, start.toDateString()]
  );

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );
  useEffect(() => {
    dispatch(ProgramActions.load("table"));
  }, [useArchive, start.toDateString()]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "up";
      Mousetrap.bind(key, () => {
        if (viewerProgram) {
          const { type, channel } = viewerProgram;
          const column = tableColumns.find(
            a => a.type === type && a.channel === channel
          );
          if (column) {
            const { id } = viewerProgram;
            const index = column.programs.findIndex(a => a.id === id);
            if (index >= 0) {
              const prevIndex = index - 1;
              if (column.programs[prevIndex]) {
                dispatch(open(column.programs, prevIndex));
                return false;
              }
              const date = new Date(start);
              date.setDate(date.getDate() - 1);
              if (!minDate || date.getTime() > new Date(minDate).getTime()) {
                dispatch(setStart(date));
                viewRef.current?.scrollToEnd({ animated: false });
              }
              return false;
            }
          }
        }
        for (const column of tableColumns) {
          if (column.programs[column.programs.length - 1]) {
            dispatch(open(column.programs, column.programs.length - 1));
            return false;
          }
        }
        return true;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [
    tableColumns,
    minDate,
    tableColumns,
    viewerProgram,
    start.toDateString()
  ]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "down";
      Mousetrap.bind(key, () => {
        if (viewerProgram) {
          const { type, channel } = viewerProgram;
          const column = tableColumns.find(
            a => a.type === type && a.channel === channel
          );
          if (column) {
            const { id } = viewerProgram;
            const index = column.programs.findIndex(a => a.id === id);
            if (index >= 0) {
              const nextIndex = index + 1;
              if (column.programs[nextIndex]) {
                dispatch(open(column.programs, nextIndex));
                return false;
              }
              const date = new Date(start);
              date.setDate(date.getDate() + 1);
              if (!maxDate || date.getTime() < new Date(maxDate).getTime()) {
                dispatch(setStart(date));
                viewRef.current?.scrollTo({ y: 0, animated: false });
              }
              return false;
            }
          }
        }
        for (const column of tableColumns) {
          if (column.programs[0]) {
            dispatch(open(column.programs, 0));
            return false;
          }
        }
        return true;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [
    tableColumns,
    maxDate,
    tableColumns,
    viewerProgram,
    start.toDateString()
  ]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "left";
      Mousetrap.bind(key, () => {
        if (viewerProgram) {
          const { type, channel } = viewerProgram;
          const columnIndex = tableColumns.findIndex(
            a => a.type === type && a.channel === channel
          );
          if (columnIndex >= 0) {
            const prevColumn = tableColumns[columnIndex - 1];
            if (prevColumn?.programs?.length > 0) {
              const startTime = new Date(viewerProgram.start).getTime();
              const nextIndex = prevColumn.programs.findIndex(
                a => new Date(a.end).getTime() > startTime
              );
              if (prevColumn.programs[nextIndex]) {
                dispatch(open(prevColumn.programs, nextIndex));
                return false;
              }
            }
            dispatch(setOffset(roundOffset(offset - 1, columns.length)));
            return false;
          }
        }
        for (const column of tableColumns) {
          if (column.programs[0]) {
            dispatch(open(column.programs, 0));
            return false;
          }
        }
        dispatch(setOffset(roundOffset(offset - 1, columns.length)));
        return false;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [offset, tableColumns, viewerProgram, columns.length]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "right";
      Mousetrap.bind(key, () => {
        if (viewerProgram) {
          const { type, channel } = viewerProgram;
          const columnIndex = tableColumns.findIndex(
            a => a.type === type && a.channel === channel
          );
          if (columnIndex >= 0) {
            const nextColumn = tableColumns[columnIndex + 1];
            if (nextColumn?.programs?.length > 0) {
              const startTime = new Date(viewerProgram.start).getTime();
              const nextIndex = nextColumn.programs.findIndex(
                a => new Date(a.end).getTime() > startTime
              );
              if (nextColumn.programs[nextIndex]) {
                dispatch(open(nextColumn.programs, nextIndex));
                return false;
              }
            }
            dispatch(setOffset(roundOffset(offset + 1, columns.length)));
            return false;
          }
        }
        for (const column of tableColumns) {
          if (column.programs[0]) {
            dispatch(open(column.programs, 0));
            return false;
          }
        }
        dispatch(setOffset(roundOffset(offset + 1, columns.length)));
        return false;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [offset, tableColumns, viewerProgram, columns.length]);
  useEffect(() => {
    if (viewerProgram && viewRef.current) {
      const { type, channel } = viewerProgram;
      const columnIndex = tableColumns.findIndex(
        a => a.type === type && a.channel === channel
      );
      if (columnIndex >= 0) {
        const column = tableColumns[columnIndex];
        const program = column.programs.find(a => a.id === selectedId);
        if (program?.position) {
          const y = (program.position - 0.5) * hourHeight;
          viewRef.current.scrollTo({ y });
        }
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
      if (scrollDiff > 0) {
        setTop(false);
      }
      if (scrollDiff < 0) {
        setBottom(false);
      }
      if (contentOffset.y <= 0) {
        headerHeightRef.current = 256;
        setTop(true);
      }
      if (
        contentOffset.y >=
        contentSize.height - layoutMeasurement.height - 1
      ) {
        headerHeightRef.current = 0;
        setBottom(true);
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
  const onChannelPress = useCallback(
    ({ type, channel }: ProgramTableColumn) => {
      dispatch(
        ProgramActions.update("list", {
          query: `type:${type} channel:${channel}`
        })
      );
      navigation.navigate("list");
    },
    []
  );
  const onLeftPress = useCallback(() => {
    dispatch(setOffset(roundOffset(offset - 1, columns.length)));
  }, [offset, columns.length]);
  const onRightPress = useCallback(() => {
    dispatch(setOffset(roundOffset(offset + 1, columns.length)));
  }, [offset, columns.length]);
  const onTopPress = useCallback(() => {
    if (isTop) {
      const date = new Date(start);
      date.setDate(date.getDate() - 1);
      if (!minDate || date.getTime() > new Date(minDate).getTime()) {
        dispatch(setStart(date));
        viewRef.current?.scrollToEnd({ animated: false });
      }
    } else {
      viewRef.current?.scrollTo({ y: 0 });
    }
  }, [maxDate, isTop, start.toDateString()]);
  const onBottomPress = useCallback(() => {
    if (isBottom) {
      const date = new Date(start);
      date.setDate(date.getDate() + 1);
      if (!maxDate || date.getTime() < new Date(maxDate).getTime()) {
        dispatch(setStart(date));
        viewRef.current?.scrollTo({ y: 0, animated: false });
      }
    } else {
      viewRef.current?.scrollToEnd();
    }
  }, [minDate, isBottom, start.toDateString()]);
  const onItemPress = useCallback(
    ({ programs }: ProgramTableColumn, { id }: ProgramTableProgram) => {
      if (programs) {
        const index = programs.findIndex(a => a.id === id);
        if (index >= 0) {
          dispatch(open(programs, index));
        }
      }
    },
    []
  );
  const useArchiveChange = useCallback((value: string | number) => {
    dispatch(SettingActions.update("useArchive", value > 0));
  }, []);
  const startChange = useCallback((start: Date) => {
    dispatch(setStart(start));
  }, []);
  const cellDateFormatter = useCallback(
    (date: Date) => dateFormatter.format(date, "HHHH:mm"),
    [dateFormatter]
  );
  const categoryCheckRenderer = useCallback(
    ({ code, name }: { code: number; name: string }) => {
      const onPress = () => {
        if (categories.indexOf(String(code)) >= 0) {
          dispatch(
            save({
              categories: categories.filter((a: string) => a !== String(code))
            })
          );
        } else {
          dispatch(
            save({
              categories: [...categories, String(code)]
            })
          );
        }
      };
      return (
        <CheckBox
          key={code}
          containerStyle={[
            styles.menuCheckbox,
            {
              backgroundColor: theme.colors?.controlBg,
              borderColor: theme.colors?.controlBorder
            }
          ]}
          textStyle={[{ color: theme.colors?.control }]}
          title={name}
          checked={categories.indexOf(String(code)) >= 0}
          onPress={onPress}
        />
      );
    },
    [theme, categories]
  );
  const columnRenderer = useCallback(
    (column: ProgramTableColumn) => (
      <TableColumn
        key={`${column.type}/${column.channel}`}
        countMode={countMode}
        selectedId={selectedId}
        dateFormatter={cellDateFormatter}
        onItemPress={onItemPress}
        {...column}
      />
    ),
    [countMode, selectedId, cellDateFormatter]
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
                : [programStyle.headerRow]
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
                icon={
                  <FontAwesome5Icon
                    name="database"
                    solid
                    color={theme.colors?.control}
                  />
                }
                style={{ backgroundColor: theme.colors?.controlBg }}
                color={theme.colors?.control}
                selectedValue={useArchive ? 1 : 0}
                onValueChange={useArchiveChange}
                items={[
                  { label: "番組表", value: 1 },
                  { label: "録画情報", value: 0 }
                ]}
              />
            )}
          </View>
          <View
            style={
              containerWidth > breakpoint
                ? [
                    containerStyle.row,
                    containerStyle.wrap,
                    containerStyle.center,
                    programStyle.headerColumn
                  ]
                : [programStyle.headerRow]
            }
          >
            <DatePicker
              containerStyle={[
                programStyle.headerControl,
                { borderColor: theme.colors?.controlBorder }
              ]}
              color={theme.colors?.control}
              backgroundColor={theme.colors?.controlBg}
              maxDate={maxDate}
              minDate={minDate}
              value={start}
              onChange={startChange}
            />
          </View>
          <View
            style={
              containerWidth > breakpoint
                ? [
                    containerStyle.row,
                    containerStyle.wrap,
                    containerStyle.right,
                    programStyle.headerColumn
                  ]
                : [programStyle.headerRow]
            }
          >
            <Menu>
              <MenuTrigger
                customStyles={{
                  triggerOuterWrapper: [
                    programStyle.headerControl,
                    {
                      backgroundColor: theme.colors?.controlBg,
                      borderColor: theme.colors?.controlBorder
                    }
                  ],
                  triggerWrapper: [
                    containerStyle.row,
                    styles.menuButton,
                    { backgroundColor: theme.colors?.controlBg }
                  ]
                }}
              >
                <View style={styles.menuButtonIcon}>
                  <FontAwesome5Icon
                    name="filter"
                    solid
                    color={
                      categories.length > 0
                        ? theme.colors?.primary
                        : theme.colors?.control
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.menuButtonText,
                    { color: theme.colors?.control }
                  ]}
                >
                  カテゴリ選択
                </Text>
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsWrapper: { backgroundColor: theme.colors?.controlBg }
                }}
              >
                <ScrollView style={styles.menuView}>
                  {categoryTable.map(categoryCheckRenderer)}
                </ScrollView>
              </MenuOptions>
            </Menu>
          </View>
        </Animated.View>
      )}
      {containerWidth > 0 && (
        <View style={[styles.view]} {...panResponder.panHandlers}>
          <View
            style={[
              styles.channelBackround,
              { backgroundColor: theme.colors?.controlBg }
            ]}
          />
          <View
            style={[
              styles.hourBackground,
              { backgroundColor: theme.colors?.controlBg }
            ]}
          />
          <Animated.View style={{ transform: [{ translateX: viewX }] }}>
            <ChannelHeader
              channels={tableColumns}
              onChannelPress={onChannelPress}
            />
          </Animated.View>
          <View
            style={[
              styles.cornerHeader,
              {
                backgroundColor: theme.colors?.controlBg,
                borderColor: theme.colors?.controlBorder
              }
            ]}
          />
          <ScrollView
            style={[styles.tableView]}
            scrollEventThrottle={16}
            ref={viewRef}
            onScroll={onScroll}
          >
            <Animated.View
              style={[
                containerStyle.row,
                styles.tableContent,
                { transform: [{ translateX: viewX }] }
              ]}
            >
              {tableColumns.map(columnRenderer)}
            </Animated.View>
            <HourHeader />
          </ScrollView>
          <TouchableOpacity style={styles.buttonLeft} onPress={onLeftPress}>
            <FontAwesome5Icon
              name="angle-left"
              solid
              style={styles.icon}
              color={theme.colors?.control}
              size={16}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonRight} onPress={onRightPress}>
            <FontAwesome5Icon
              name="angle-right"
              solid
              style={styles.icon}
              color={theme.colors?.control}
              size={16}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonTop} onPress={onTopPress}>
            <FontAwesome5Icon
              name={hasPrevious && isTop ? "angle-double-up" : "angle-up"}
              solid
              style={styles.icon}
              color={theme.colors?.control}
              size={16}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonBottom} onPress={onBottomPress}>
            <FontAwesome5Icon
              name={hasNext && isBottom ? "angle-double-down" : "angle-down"}
              solid
              style={styles.icon}
              color={theme.colors?.control}
              size={16}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
export default ProgramTable;

const ChannelHeader = memo(
  ({
    channels,
    onChannelPress
  }: {
    channels: ProgramTableColumn[];
    onChannelPress?: (column: ProgramTableColumn) => void;
  }) => {
    const channelRenderer = useCallback(
      (column: ProgramTableColumn) => (
        <ChannelCell
          key={`${column.type}/${column.channel}`}
          onPress={onChannelPress}
          {...column}
        />
      ),
      [onChannelPress]
    );

    return (
      <View
        style={[
          containerStyle.row,
          containerStyle.center,
          styles.channelHeader
        ]}
      >
        {channels.map(channelRenderer)}
      </View>
    );
  }
);

const ChannelCell = memo(
  ({
    onPress,
    ...props
  }: ProgramTableColumn & {
    onPress?: (channel: ProgramTableColumn) => void;
  }) => {
    const { channelName } = props;

    const { theme } = useContext(ThemeContext);

    const onPressWithProps = useCallback(() => {
      if (onPress) {
        onPress(props);
      }
    }, [props, onPress]);

    return (
      <TouchableOpacity
        style={[
          styles.channelCell,
          {
            borderColor: theme.colors?.controlBorder
          }
        ]}
        onPress={onPressWithProps}
      >
        <Text style={[textStyle.center, { color: theme.colors?.control }]}>
          {channelName}
        </Text>
      </TouchableOpacity>
    );
  }
);

const HourHeader = memo(() => {
  const hourFirst = useSelector<State, number>(({ setting }) =>
    parseInt(setting.view?.hourFirst || "4", 10)
  );
  const hourFormat = useSelector<State, string>(
    ({ setting }) => setting.view?.hourFormat || ""
  );

  const { theme } = useContext(ThemeContext);

  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );
  const hours = useMemo(() => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour = new Date();
      hour.setHours(hourFirst + i);
      hours.push(dateFormatter.getHour(hour));
    }
    return hours;
  }, [hourFirst]);

  const hourRenderer = useCallback(
    (hour: number) => (
      <View
        key={hour}
        style={[styles.hourCell, { borderColor: theme.colors?.controlBorder }]}
      >
        <Text style={[textStyle.center, { color: theme.colors?.control }]}>
          {hour}
        </Text>
      </View>
    ),
    [dateFormatter]
  );

  return (
    <View
      style={[
        styles.hourHeader,
        {
          backgroundColor: theme.colors?.controlBg
        }
      ]}
    >
      {hours.map(hourRenderer)}
    </View>
  );
});

const TableColumn = memo(
  ({
    selectedId,
    countMode = "speed",
    dateFormatter = (date: Date) => `${date.getHours()}:${date.getMinutes()}`,
    onItemPress,
    ...props
  }: ProgramTableColumn & {
    selectedId?: string;
    countMode?: string;
    dateFormatter?: (date: Date) => string;
    onItemPress?: (
      column: ProgramTableColumn,
      program: ProgramTableProgram
    ) => void;
  }) => {
    const { programs = [] } = props;

    const onPress = useCallback(
      (program: ProgramTableProgram) => {
        if (onItemPress) {
          onItemPress(props, program);
        }
      },
      [props]
    );
    const cellRenderer = useCallback(
      (program: ProgramTableProgram) => (
        <TableCell
          key={program.id}
          selected={program.id === selectedId}
          dateFormatter={dateFormatter}
          onPress={onPress}
          {...program}
        />
      ),
      [selectedId, onPress]
    );
    const balloonRenderer = useCallback(
      (program: ProgramTableProgram) => (
        <ProgramTableBalloon
          key={program.id}
          countMode={countMode}
          onPress={onPress}
          {...program}
        />
      ),
      [countMode, onPress]
    );

    return (
      <View style={styles.tableColumn}>
        {programs.map(cellRenderer)}
        {countMode !== "none" && programs.map(balloonRenderer)}
      </View>
    );
  }
);

const TableCell = memo(
  ({
    selected = false,
    dateFormatter = date => `${date.getHours()}:${date.getMinutes()}`,
    onPress,
    ...props
  }: ProgramTableProgram & {
    selected?: boolean;
    dateFormatter?: (date: Date) => string;
    onPress?: (column: ProgramTableProgram) => void;
  }) => {
    const {
      start,
      fullTitle,
      detail,
      category,
      position = 0,
      size = 0
    } = props;

    const { theme } = useContext(ThemeContext);

    const onPressWithProps = useCallback(() => {
      if (onPress) {
        onPress(props);
      }
    }, [props, onPress]);

    return (
      <View
        style={[
          styles.tableCellWrapper,
          {
            backgroundColor: theme.colors?.background,
            borderColor: theme.colors?.divider,
            top: position * hourHeight,
            height: size * hourHeight
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tableCell,
            selected && { backgroundColor: theme.colors?.selected }
          ]}
          onPress={onPressWithProps}
        >
          <View style={[containerStyle.row, containerStyle.wrap]}>
            <Text style={[textStyle.bold]}>
              <Text style={[{ color: theme.colors?.primary }]}>
                {dateFormatter(start)}
              </Text>{" "}
              {fullTitle}
            </Text>
            <Badge
              badgeStyle={[{ backgroundColor: category.color }]}
              value={category.name}
            />
          </View>
          <Text>{detail}</Text>
        </TouchableOpacity>
      </View>
    );
  }
);

const ProgramTableBalloon = memo(
  ({
    countMode = "speed",
    onPress,
    ...props
  }: ProgramTableProgram & {
    countMode?: string;
    onPress?: (program: ProgramTableProgram) => void;
  }) => {
    const {
      commentCount = 0,
      commentSpeed = 0,
      commentMaxSpeed = 0,
      position = 0
    } = props;

    if (!commentCount) {
      return null;
    }

    const count = useMemo(() => {
      switch (countMode) {
        case "comment":
          return commentCount;
        case "maxspeed":
          return commentMaxSpeed;
        case "speed":
        default:
          return Math.ceil(commentSpeed * 10) / 10;
      }
    }, [countMode]);
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
    }, [commentMaxSpeed]);
    const top = useMemo(() => {
      let top = position * hourHeight - 16;
      if (top < 0) {
        top = 0;
      }
      return top;
    }, [position]);

    const onPressWithProps = useCallback(() => {
      if (onPress) {
        onPress(props);
      }
    }, [props, onPress]);

    if (!count) {
      return null;
    }
    return (
      <Balloon
        wrapperStyle={{
          position: "absolute",
          right: 0,
          top
        }}
        backgroundColor={balloonColor}
        pointing="left"
        onPress={onPressWithProps}
      >
        {count}
      </Balloon>
    );
  }
);

const breakpoint = 540;
const hourWidth = 32;
const hourHeight = 240;
const scrollbarWidth = Platform.OS === "web" ? 20 : 0;

const styles = StyleSheet.create({
  header: {
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  menuButton: {
    height: 32
  },
  menuButtonIcon: {
    alignItems: "center",
    width: 32
  },
  menuButtonText: {
    paddingLeft: 8
  },
  menuView: {
    maxHeight: hourHeight
  },
  menuCheckbox: {
    borderRadius: 0,
    margin: 0,
    marginLeft: 0,
    marginRight: 0
  },
  view: {
    flex: 1
  },
  cornerHeader: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    height: 32,
    left: 0,
    position: "absolute",
    top: 0,
    width: hourWidth
  },
  channelBackround: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    height: 32
  },
  hourBackground: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: hourWidth
  },
  channelHeader: {
    alignItems: "stretch",
    height: 32,
    paddingLeft: hourWidth,
    paddingRight: scrollbarWidth
  },
  channelCell: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden"
  },
  hourHeader: {
    bottom: 0,
    height: hourHeight * 24,
    left: 0,
    position: "absolute",
    top: 0,
    width: hourWidth
  },
  hourCell: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderRightWidth: 1,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden"
  },
  tableView: {
    flex: 1
  },
  tableContent: {
    flex: 1,
    marginLeft: hourWidth
  },
  tableColumn: {
    flex: 1,
    height: hourHeight * 24
  },
  tableCellWrapper: {
    borderWidth: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0
  },
  tableCell: {
    flex: 1
  },
  icon: {
    height: 32,
    lineHeight: 32,
    textAlign: "center",
    width: 32
  },
  buttonLeft: {
    position: "absolute",
    top: 0,
    left: hourWidth
  },
  buttonRight: {
    position: "absolute",
    right: scrollbarWidth,
    top: 0
  },
  buttonTop: {
    position: "absolute",
    left: 0,
    top: 32
  },
  buttonBottom: {
    bottom: 0,
    position: "absolute",
    left: 0
  }
});
