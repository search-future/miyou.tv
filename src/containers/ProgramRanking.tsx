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
import {
  FlatList,
  Switch,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  ListRenderItem,
  NativeSyntheticEvent,
  NativeScrollEvent
} from "react-native";
import { Badge, ListItem, Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import DatePicker from "../components/DatePicker";
import IconSelector from "../components/IconSelector";
import colorStyle, { dark, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import programStyle from "../styles/program";
import { RootState } from "../modules";
import {
  ProgramActions,
  ProgramState,
  ProgramRankingData,
  ProgramRankingProgram
} from "../modules/program";
import { ProgramRankingTarget } from "../modules/program/ranking";
import { SettingActions, SettingState } from "../modules/setting";
import { ViewerActions } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";

type Options = {
  unique?: boolean;
  view?: string;
};
type Setting = SettingState & {
  rankingOptions?: Options;
  useArchive?: boolean;
  view?: {
    hourFirst?: string;
    hourFormat?: string;
  };
};
type State = RootState & {
  program: ProgramState & { ranking: ProgramRankingData };
  setting: Setting;
};

const save = (options = {}) => {
  return SettingActions.update("rankingOptions", options);
};
const setTarget = (target: string) => {
  return ProgramActions.update("ranking", { target });
};
const setStart = (start: Date) => {
  return ProgramActions.update("ranking", { start });
};
const open = (programs: ProgramRankingProgram[], index: number) => {
  return ViewerActions.open(programs, index);
};

const ProgramRanking = memo(() => {
  const listRef = useRef<FlatList>(null);
  const layoutCallbackId = useRef<number>();
  const updaterId = useRef<number>();
  const lastUpdate = useRef(Date.now());
  const scrollPos = useRef(0);
  const headerHeightRef = useRef(256);
  const headerHeight = useRef(new Animated.Value(headerHeightRef.current))
    .current;
  const viewX = useRef(new Animated.Value(0)).current;

  const dispatch = useDispatch();
  const useArchive = useSelector<State, boolean>(
    ({ setting }) => setting.useArchive == null || setting.useArchive
  );
  const hourFirst = useSelector<State, number>(({ setting }) =>
    parseInt(setting.view?.hourFirst || "4", 10)
  );
  const hourFormat = useSelector<State, string>(
    ({ setting }) => setting.view?.hourFormat || ""
  );
  const unique = useSelector<State, boolean>(
    ({ setting }) =>
      setting.rankingOptions?.unique == null || setting.rankingOptions?.unique
  );
  const view = useSelector<State, number>(({ setting }) =>
    parseInt(setting.rankingOptions?.view || "25", 10)
  );
  const end = useSelector<State, Date>(
    ({ program }) => program.ranking?.end || new Date()
  );
  const maxDate = useSelector<State, Date | undefined>(
    ({ program }) => program.ranking?.maxDate
  );
  const minDate = useSelector<State, Date | undefined>(
    ({ program }) => program.ranking?.minDate
  );
  const programs = useSelector<State, ProgramRankingProgram[]>(
    ({ program }) => program.ranking?.programs || []
  );
  const start = useSelector<State, Date>(
    ({ program }) => program.ranking?.start || new Date(Date.now() - 86400000)
  );
  const target = useSelector<State, string>(
    ({ program }) => program.ranking?.target || ",,1"
  );
  const targets = useSelector<State, ProgramRankingTarget[]>(
    ({ program }) =>
      program.ranking?.targets || [
        {
          label: "総合(24時間)",
          value: ",,1"
        }
      ],
    shallowEqual
  );
  const archiveActive = useSelector<State, boolean>(
    ({ service: { archiveActive } }) => archiveActive
  );
  const isOpened = useSelector<State, boolean>(({ viewer }) => viewer.isOpened);
  const playing = useSelector<State, boolean>(({ viewer }) => viewer.playing);
  const viewerIndex = useSelector<State, number>(({ viewer }) => viewer.index);
  const selectedId = useSelector<State, string | undefined>(
    ({ viewer }) => viewer.programs[viewer.index]?.id
  );

  const [containerWidth, setContainerWidth] = useState(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: ({}, { dx }) => Math.abs(dx) > 10,
        onPanResponderMove: Animated.event([null, { dx: viewX }]),
        onPanResponderEnd: ({}, { dx }) => {
          if (Math.abs(dx) > 64) {
            const [, , days] = target.split(",");
            start.setDate(start.getDate() - Math.sign(dx) * parseInt(days, 10));
            Animated.timing(viewX, {
              toValue: Math.sign(dx) * containerWidth
            }).start(() => {
              dispatch(setStart(start));
            });
          } else {
            viewX.setValue(0);
          }
        }
      }),
    [target, containerWidth, start.toDateString()]
  );
  const targetName = useMemo(
    () => targets.find(({ value }) => value === target)?.label,
    [target, targets]
  );
  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
      clearTimeout(updaterId.current);
    },
    []
  );
  useEffect(() => {
    dispatch(ProgramActions.load("ranking"));
    viewX.setValue(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [useArchive, unique, view, target, start.toDateString()]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "up";
      Mousetrap.bind(key, () => {
        if (programs[viewerIndex]?.id === selectedId) {
          const index = viewerIndex - 1;
          if (programs[index]) {
            dispatch(open(programs, index));
          }
          return false;
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
  }, [programs, viewerIndex, selectedId]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "down";
      Mousetrap.bind(key, () => {
        if (programs[viewerIndex]?.id === selectedId) {
          const index = viewerIndex + 1;
          if (programs[index]) {
            dispatch(open(programs, index));
          }
          return false;
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
  }, [programs, viewerIndex, selectedId]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "left";
      Mousetrap.bind(key, () => {
        const [, , days] = target.split(",");
        start.setDate(start.getDate() - parseInt(days, 10));
        dispatch(setStart(start));
        return false;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [target]);
  useEffect(() => {
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      const key = "right";
      Mousetrap.bind(key, () => {
        const [, , days] = target.split(",");
        start.setDate(start.getDate() + parseInt(days, 10));
        dispatch(setStart(start));
        return false;
      });
      return () => {
        Mousetrap.unbind(key);
      };
    }
  }, [target]);
  useEffect(() => {
    if (isOpened && !playing && programs[viewerIndex]?.id === selectedId) {
      const updater = () => {
        dispatch(open(programs, viewerIndex));
        lastUpdate.current = Date.now();
      };
      clearTimeout(updaterId.current);
      if (Date.now() - lastUpdate.current > 10000) {
        updater();
      } else {
        updaterId.current = setTimeout(updater, 1000);
      }
    }
  }, [programs, isOpened, playing]);
  useEffect(() => {
    if (listRef.current && programs[viewerIndex]?.id === selectedId) {
      listRef.current.scrollToIndex({ index: viewerIndex, viewPosition: 0.5 });
    }
  }, [viewerIndex]);

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
      const { contentOffset } = nativeEvent;
      headerHeightRef.current += scrollPos.current - contentOffset.y;
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
  const targetChange = useCallback((target: string | number) => {
    dispatch(setTarget(String(target)));
  }, []);
  const startChange = useCallback((start: Date) => {
    dispatch(setStart(start));
  }, []);
  const uniqueChange = useCallback((unique: boolean) => {
    dispatch(save({ unique }));
  }, []);
  const viewChange = useCallback((view: string | number) => {
    dispatch(save({ view }));
  }, []);
  const onItemPress = useCallback(
    ({ id, rank }: ProgramRankingProgram) => {
      const index = programs.findIndex(a => a.id === id && a.rank === rank);
      dispatch(open(programs, index));
    },
    [programs]
  );
  const keyExtractor = useCallback(
    ({ id }: ProgramRankingProgram, index: number) => `${index}/${id}`,
    []
  );
  const listDateFormatter = useCallback(
    (date: Date) => dateFormatter.format(date, "YYYY/MM/DD A HHHH:mm"),
    [dateFormatter]
  );
  const listRenderer: ListRenderItem<ProgramRankingProgram> = useCallback(
    ({ item, index }) => (
      <ListProgram
        selected={item.id === selectedId && index === viewerIndex}
        dateFormatter={listDateFormatter}
        onPress={onItemPress}
        {...item}
      />
    ),
    [viewerIndex, selectedId, listDateFormatter, onItemPress]
  );

  return (
    <View style={[colorStyle.bgLight, styles.container]} onLayout={onLayout}>
      {containerWidth > 0 && (
        <Animated.View
          style={[
            containerWidth > breakpoint
              ? containerStyle.row
              : containerStyle.column,
            colorStyle.bgBlack,
            styles.header,
            {
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
                  colorStyle.bgDark,
                  colorStyle.borderGrayDark,
                  programStyle.headerControl
                ]}
                style={colorStyle.bgDark}
                color={light}
                icon={<FontAwesome5Icon name="database" solid color={light} />}
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
                colorStyle.bgDark,
                colorStyle.borderGrayDark,
                programStyle.headerControl,
                styles.targetPicker
              ]}
              style={colorStyle.bgDark}
              color={light}
              icon={<FontAwesome5Icon name="clock" solid color={light} />}
              selectedValue={target}
              onValueChange={targetChange}
              items={targets}
            />
            <DatePicker
              containerStyle={[
                colorStyle.borderGrayDark,
                programStyle.headerControl
              ]}
              color={light}
              backgroundColor={dark}
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
              <Switch value={unique} onValueChange={uniqueChange} />
              <Text style={colorStyle.light}> 同一の番組を再表示しない</Text>
            </View>
            <IconSelector
              icon={
                <FontAwesome5Icon name="arrows-alt-v" solid color={light} />
              }
              containerStyle={[
                colorStyle.bgDark,
                colorStyle.borderGrayDark,
                programStyle.headerControl
              ]}
              style={colorStyle.bgDark}
              color={light}
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
          style={[styles.view, { left: viewX }]}
          {...panResponder.panHandlers}
        >
          <FlatList
            style={programStyle.list}
            contentContainerStyle={[
              colorStyle.bgWhite,
              programStyle.listContents
            ]}
            data={programs}
            ref={listRef}
            keyExtractor={keyExtractor}
            renderItem={listRenderer}
            ListHeaderComponent={
              <ListHeader
                visible={programs.length > 0}
                targetName={targetName}
                start={dateFormatter.format(start, "YYYY/MM/DD A HHHH:mm")}
                end={dateFormatter.format(end, "YYYY/MM/DD A HHHH:mm")}
              />
            }
            onScroll={onScroll}
          />
        </Animated.View>
      )}
    </View>
  );
});
export default ProgramRanking;

const ListHeader = memo(
  ({
    visible = true,
    targetName,
    start,
    end
  }: {
    visible?: boolean;
    targetName?: string;
    start: string;
    end: string;
  }) =>
    visible ? (
      <View
        style={[
          containerStyle.row,
          containerStyle.wrap,
          programStyle.listHeader
        ]}
      >
        <Text h4 style={[textStyle.bold, colorStyle.black]}>
          勢いランキング{" "}
        </Text>
        <Text h4 style={[textStyle.bold, colorStyle.black]}>
          {targetName}{" "}
        </Text>
        <Text style={colorStyle.black}>
          期間: {start}～{end}
        </Text>
      </View>
    ) : null
);
const ListProgram = memo(
  ({
    selected = false,
    dateFormatter = date => date.toString(),
    onPress,
    ...props
  }: ProgramRankingProgram & {
    selected?: boolean;
    dateFormatter?: (date: Date) => string;
    onPress?: (program: ProgramRankingProgram) => void;
  }) => {
    const {
      channelName,
      fullTitle,
      category,
      duration,
      start,
      rank = 0,
      commentCount = 0,
      commentSpeed = 0,
      commentMaxSpeed = 0,
      commentMaxSpeedTime
    } = props;

    const onPressWithProps = useCallback(() => {
      if (onPress) {
        onPress(props);
      }
    }, [props, onPress]);

    return (
      <ListItem
        containerStyle={selected && programStyle.selected}
        titleStyle={[textStyle.bold, colorStyle.black]}
        title={fullTitle}
        chevron
        bottomDivider
        Component={TouchableOpacity}
        subtitle={
          <View>
            <View style={[containerStyle.row, containerStyle.wrap]}>
              <Text style={[textStyle.bold, colorStyle.black]}>
                {commentMaxSpeed}コメント/分
                {commentMaxSpeedTime &&
                  `(${dateFormatter(commentMaxSpeedTime)})`}{" "}
              </Text>
              <Text style={colorStyle.black}>
                平均: {Math.ceil(commentSpeed * 10) / 10}コメント/分{" "}
              </Text>
              <Text>コメント数: {commentCount}</Text>
            </View>
            <View style={[containerStyle.row, containerStyle.wrap]}>
              <Badge
                badgeStyle={[
                  colorStyle.borderLight,
                  { backgroundColor: category.color }
                ]}
                value={category.name}
              />
              <Text style={colorStyle.black}>{channelName} </Text>
              <Text style={colorStyle.black}>
                {dateFormatter(start)}({Math.round(duration / 60000)}分)
              </Text>
            </View>
          </View>
        }
        leftElement={
          <View style={programStyle.listItemLeft}>
            <Text
              h3
              style={[textStyle.center, textStyle.bold, colorStyle.active]}
            >
              {rank}
            </Text>
          </View>
        }
        onPress={onPressWithProps}
      />
    );
  }
);

const breakpoint = 540;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  view: {
    flex: 1
  },
  targetPicker: {
    minWidth: 320
  }
});
