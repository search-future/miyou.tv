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
import {
  FlatList,
  Switch,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleSheet,
  Platform,
  Animated,
  PanResponderInstance,
  PanResponder
} from "react-native";
import { Badge, ListItem, Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import DatePicker from "../components/DatePicker";
import IconSelector from "../components/IconSelector";
import colorStyle, { dark, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import programStyle from "../styles/program";
import {
  ProgramActions,
  ProgramState,
  ProgramRankingData,
  ProgramRankingProgram
} from "../modules/program";
import { ServiceState } from "../modules/service";
import { SettingActions, SettingState } from "../modules/setting";
import { ViewerActions, ViewerState } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";

type Props = {
  dispatch: Dispatch;
  data: ProgramRankingData;
  service: ServiceState;
  setting: SettingState & {
    rankingOptions?: {
      unique?: boolean;
      view?: string;
    };
    useArchive?: boolean;
    view?: {
      hourFirst?: string;
      hourFormat?: string;
    };
  };
  viewer: ViewerState;
};
type State = {
  containerWidth: number;
  headerHeight: Animated.AnimatedValue;
  viewX: Animated.AnimatedValue;
};
class ProgramRanking extends Component<Props, State> {
  list: FlatList<ProgramRankingProgram> | null = null;
  panResponder: PanResponderInstance;
  state = {
    containerWidth: 0,
    headerHeight: new Animated.Value(256),
    viewX: new Animated.Value(0)
  };
  bindKeys: (string | string[])[] = [];
  layoutCallbackId?: number;
  scrollPos = 0;
  headerHeight = 256;
  selected = false;

  constructor(props: Props) {
    super(props);
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: ({}, { dx }) => Math.abs(dx) > 10,
      onPanResponderMove: Animated.event([null, { dx: this.state.viewX }]),
      onPanResponderEnd: ({}, { dx }) => {
        const { containerWidth, viewX } = this.state;
        if (Math.abs(dx) > 64) {
          if (dx > 0) {
            Animated.timing(viewX, {
              toValue: containerWidth
            }).start(() => {
              const { viewX } = this.state;
              viewX.setValue(0);
            });
            this.previous();
          } else {
            Animated.timing(viewX, {
              toValue: -containerWidth
            }).start(() => {
              const { viewX } = this.state;
              viewX.setValue(0);
            });
            this.next();
          }
        } else {
          viewX.setValue(0);
        }
      }
    });
  }

  render() {
    const { data, service, setting, viewer } = this.props;
    const {
      programs = [],
      maxDate,
      minDate,
      start = new Date(Date.now() - 86400000),
      end = new Date(),
      target = ",,1",
      targets = [
        {
          label: "総合(24時間)",
          value: ",,1"
        }
      ]
    } = data;
    const { archiveActive } = service;
    const {
      rankingOptions = {},
      useArchive = true,
      view: viewSetting = {}
    } = setting;
    const { unique = true, view = "25" } = rankingOptions;
    const { hourFirst = "4", hourFormat = "" } = viewSetting;
    const { programs: viewerPrograms, index: viewerIndex } = viewer;
    const viewerProgram = viewerPrograms[viewerIndex] || {};
    const { containerWidth, headerHeight, viewX } = this.state;

    const { label: targetName = "" } =
      targets.find(({ value }) => value === target) || {};

    const dateFormatter = new DateFormatter(
      parseInt(hourFirst, 10),
      hourFormat
    );

    return (
      <View
        style={[colorStyle.bgLight, styles.container]}
        onLayout={({ nativeEvent }) => {
          if (this.layoutCallbackId != null) {
            clearTimeout(this.layoutCallbackId);
          }
          const { layout } = nativeEvent;
          const containerWidth = layout.width;
          this.layoutCallbackId = setTimeout(() => {
            this.setState({ containerWidth });
          }, 200);
        }}
      >
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
                  style={[colorStyle.bgDark, colorStyle.light as ViewStyle]}
                  itemStyle={colorStyle.light}
                  icon={
                    <FontAwesome5Icon name="database" solid color={light} />
                  }
                  selectedValue={useArchive ? 1 : 0}
                  onValueChange={value => {
                    const { dispatch } = this.props;
                    dispatch(SettingActions.update("useArchive", value > 0));
                    this.load();
                  }}
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
                style={[colorStyle.bgDark, colorStyle.light as ViewStyle]}
                itemStyle={colorStyle.light}
                icon={<FontAwesome5Icon name="clock" solid color={light} />}
                selectedValue={target}
                onValueChange={target => {
                  this.update({ target });
                  this.load();
                }}
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
                value={new Date(start)}
                onChange={start => {
                  this.update({ start });
                  this.load();
                }}
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
                <Switch
                  value={unique}
                  onValueChange={unique => {
                    this.save({ unique });
                    this.load();
                  }}
                />
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
                style={[colorStyle.bgDark, colorStyle.light as ViewStyle]}
                itemStyle={colorStyle.light}
                selectedValue={view}
                onValueChange={view => {
                  this.save({ view });
                  this.load();
                }}
                items={[
                  { label: "10件表示", value: "10" },
                  { label: "25件表示", value: "25" },
                  { label: "50件表示", value: "50" },
                  { label: "100件表示", value: "100" }
                ]}
              />
            </View>
          </Animated.View>
        )}
        {containerWidth > 0 && (
          <Animated.View
            style={[styles.view, { left: viewX }]}
            {...this.panResponder.panHandlers}
          >
            <FlatList
              style={programStyle.list}
              contentContainerStyle={[
                colorStyle.bgWhite,
                programStyle.listContents
              ]}
              data={programs}
              extraData={data}
              ref={list => {
                this.list = list;
              }}
              keyExtractor={({}, index) => String(index)}
              renderItem={({
                item: {
                  id,
                  channelName,
                  fullTitle,
                  category,
                  duration,
                  start,
                  rank,
                  commentCount = 0,
                  commentSpeed = 0,
                  commentMaxSpeed = 0,
                  commentMaxSpeedTime
                },
                index
              }) => (
                <ListItem
                  containerStyle={
                    index === viewerIndex &&
                    id === viewerProgram.id &&
                    programStyle.selected
                  }
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
                            dateFormatter.format(
                              commentMaxSpeedTime,
                              "(YYYY/MM/DD A HHHH:mm)"
                            )}{" "}
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
                          {dateFormatter.format(start, "YYYY/MM/DD A HHHH:mm")}(
                          {Math.round(duration / 60000)}分)
                        </Text>
                      </View>
                    </View>
                  }
                  leftElement={
                    <View style={programStyle.listItemLeft}>
                      <Text
                        h3
                        style={[
                          textStyle.center,
                          textStyle.bold,
                          colorStyle.active
                        ]}
                      >
                        {rank}
                      </Text>
                    </View>
                  }
                  onPress={() => {
                    this.open(programs, index);
                  }}
                />
              )}
              ListHeaderComponent={
                programs.length > 0 ? (
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
                      期間:{" "}
                      {dateFormatter.format(start, "YYYY/MM/DD A HHHH:mm")}～
                      {dateFormatter.format(end, "YYYY/MM/DD A HHHH:mm")}
                    </Text>
                  </View>
                ) : null
              }
              onScroll={({ nativeEvent }) => {
                const { contentOffset } = nativeEvent;
                const { headerHeight } = this.state;
                this.headerHeight += this.scrollPos - contentOffset.y;
                if (this.headerHeight > 256) {
                  this.headerHeight = 256;
                } else if (this.headerHeight < 0) {
                  this.headerHeight = 0;
                }
                headerHeight.setValue(this.headerHeight);
                this.scrollPos = contentOffset.y;
              }}
            />
          </Animated.View>
        )}
      </View>
    );
  }

  componentDidMount() {
    this.load();

    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      this.bindKeys.push("up");
      Mousetrap.bind("up", () => {
        const { data, viewer } = this.props;
        const { programs = [] } = data;
        if (viewer.programs[viewer.index]) {
          const { id } = viewer.programs[viewer.index];
          const index = programs.findIndex(a => a.id === id);
          if (programs[index - 1]) {
            this.open(programs, index - 1);
          }
        }
      });
      this.bindKeys.push("down");
      Mousetrap.bind("down", () => {
        const { data, viewer } = this.props;
        const { programs = [] } = data;
        if (viewer.programs[viewer.index]) {
          const { id } = viewer.programs[viewer.index];
          const index = programs.findIndex(a => a.id === id);
          if (programs[index + 1]) {
            this.open(programs, index + 1);
          }
        }
      });
      Mousetrap.bind("left", () => {
        this.previous();
      });
      this.bindKeys.push("right");
      Mousetrap.bind("right", () => {
        this.next();
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { viewer, data } = this.props;
    if (this.selected && viewer.isOpened && data !== prevProps.data) {
      const { programs = [] } = data;
      const { index } = viewer;
      this.open(programs, index);
    }
    if (
      viewer !== prevProps.viewer &&
      viewer.index !== prevProps.viewer.index
    ) {
      const { programs, index } = viewer;
      const program = programs[index];
      if (program) {
        this.scrollToProgram(program, index);
      }
    }
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      for (const key of this.bindKeys) {
        Mousetrap.unbind(key);
      }
    }
  }

  save(options = {}) {
    const { dispatch } = this.props;
    dispatch(SettingActions.update("rankingOptions", options));
  }

  update(data = {}) {
    const { dispatch } = this.props;
    dispatch(ProgramActions.update("ranking", data));
  }

  load() {
    const { dispatch } = this.props;
    dispatch(ProgramActions.load("ranking"));
    if (this.list) {
      this.list.scrollToOffset({ offset: 0, animated: false });
    }
    this.selected = false;
  }

  open(programs: ProgramRankingProgram[], index: number) {
    const { dispatch } = this.props;
    dispatch(ViewerActions.open(programs, index));
    this.selected = Platform.OS === "web";
  }

  scrollToProgram(program: ProgramRankingProgram, index?: number) {
    if (this.list) {
      const { data } = this.props;
      const { programs = [] } = data;
      const { id: itemId } = program;
      const item = programs.find(
        ({ id }, i) => id === itemId && (index == null || i === index)
      );
      if (item) {
        this.list.scrollToItem({ item, viewPosition: 0.5 });
      }
    }
  }

  previous() {
    const { data } = this.props;
    const { start = new Date(Date.now() - 86400000), target = ",,1" } = data;
    const [, , days] = target.split(",");
    start.setDate(start.getDate() - parseInt(days, 10));
    this.update({ start });
    this.load();
  }

  next() {
    const { data } = this.props;
    const { start = new Date(Date.now() - 86400000), target = ",,1" } = data;
    const [, , days] = target.split(",");
    start.setDate(start.getDate() + parseInt(days, 10));
    this.update({ start });
    this.load();
  }
}

export default connect(
  ({
    program: { ranking: data = {} },
    service,
    setting,
    viewer
  }: {
    program: ProgramState;
    service: ServiceState;
    setting: SettingState;
    viewer: ViewerState;
  }) => ({
    data,
    service,
    setting,
    viewer
  })
)(ProgramRanking);

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
