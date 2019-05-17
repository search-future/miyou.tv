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
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  ScrollView
} from "react-native";
import { Text, CheckBox } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption
} from "react-native-popup-menu";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import { SettingState, SettingActions } from "../modules/setting";
import {
  CommentPlayerState,
  CommentData,
  CommentPlayerActions
} from "../modules/commentPlayer";
import colorStyle, { light, active, black } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import DateFormatter from "../utils/DateFormatter";
import formatTime from "../utils/formatTime";
import { PlayerActions } from "../modules/player";
import { ServiceState } from "../modules/service";
import CommentService from "../services/CommentService";

type Props = {
  dispatch: Dispatch;
  commentPlayer: CommentPlayerState;
  setting: SettingState & {
    queryTable?: { [channel: string]: string[] };
  };
  service: ServiceState;
};
type State = {};
class CommentInfo extends Component<Props, State> {
  list: FlatList<CommentData> | null = null;
  updaterId?: number;
  poniter = 0;

  render() {
    const { commentPlayer, service, setting } = this.props;
    const { channel, data, titles, filters, speed, autoScroll } = commentPlayer;
    const { commentChannels } = service;
    const { queryTable = {} } = setting;
    const queries = queryTable[channel] || [
      CommentService.normalizeChannel(channel)
    ];
    return (
      <View style={styles.container}>
        <View style={containerStyle.row}>
          <Menu>
            <MenuTrigger
              customStyles={{
                triggerWrapper: [
                  containerStyle.row,
                  colorStyle.bgDark,
                  colorStyle.borderGrayDark,
                  styles.menuButton
                ]
              }}
            >
              <Text style={[colorStyle.light, styles.menuButtonText]}>
                チャンネル
              </Text>
              <View style={styles.menuButtonIcon}>
                <FontAwesome5Icon name="caret-down" solid color={light} />
              </View>
            </MenuTrigger>
            <MenuOptions
              customStyles={{
                optionsContainer: [colorStyle.bgBlack, styles.menuContainer]
              }}
            >
              <ScrollView style={styles.menuView}>
                {commentChannels
                  .filter(({ id }) => queries.indexOf(id) >= 0)
                  .map(({ id }, index) => (
                    <CheckBox
                      key={index}
                      containerStyle={[
                        colorStyle.bgDark,
                        colorStyle.borderGrayDark,
                        styles.menuCheckbox
                      ]}
                      textStyle={colorStyle.light}
                      title={id}
                      checked
                      onPress={() => {
                        const { dispatch, commentPlayer, setting } = this.props;
                        const { channel } = commentPlayer;
                        const { queryTable = {} } = setting;
                        const queries = queryTable[channel] || [
                          CommentService.normalizeChannel(channel)
                        ];
                        queries.splice(queries.indexOf(id), 1);
                        queryTable[channel] = queries;
                        dispatch(
                          SettingActions.update("queryTable", queryTable)
                        );
                      }}
                    />
                  ))}
                {commentChannels
                  .filter(({ id }) => queries.indexOf(id) < 0)
                  .map(({ id }) => (
                    <CheckBox
                      key={id}
                      containerStyle={[
                        colorStyle.bgDark,
                        colorStyle.borderGrayDark,
                        styles.menuCheckbox
                      ]}
                      textStyle={colorStyle.light}
                      title={id}
                      checked={false}
                      onPress={() => {
                        const { dispatch, commentPlayer, setting } = this.props;
                        const { channel } = commentPlayer;
                        const { queryTable = {} } = setting;
                        const queries = queryTable[channel] || [
                          CommentService.normalizeChannel(channel)
                        ];
                        queries.push(id);
                        queryTable[channel] = queries;
                        dispatch(
                          SettingActions.update("queryTable", queryTable)
                        );
                      }}
                    />
                  ))}
              </ScrollView>
            </MenuOptions>
          </Menu>
          <Menu>
            <MenuTrigger
              customStyles={{
                triggerWrapper: [
                  containerStyle.row,
                  colorStyle.bgDark,
                  colorStyle.borderGrayDark,
                  styles.menuButton
                ]
              }}
            >
              <Text style={[colorStyle.light, styles.menuButtonText]}>
                スレッド
              </Text>
              <View style={styles.menuButtonIcon}>
                <FontAwesome5Icon name="caret-down" solid color={light} />
              </View>
            </MenuTrigger>
            <MenuOptions
              customStyles={{
                optionsContainer: [colorStyle.bgBlack, styles.menuContainer]
              }}
            >
              <ScrollView style={styles.menuView}>
                {titles.map((title, index) => (
                  <CheckBox
                    key={index}
                    containerStyle={[
                      colorStyle.bgDark,
                      colorStyle.borderGrayDark,
                      styles.menuCheckbox
                    ]}
                    textStyle={colorStyle.light}
                    title={title}
                    checked={filters.indexOf(title) >= 0}
                    onPress={() => {
                      const { dispatch, commentPlayer } = this.props;
                      const { filters } = commentPlayer;
                      const index = filters.indexOf(title);
                      if (index >= 0) {
                        filters.splice(index, 1);
                      } else {
                        filters.push(title);
                      }
                      dispatch(CommentPlayerActions.setFilters(filters));
                    }}
                  />
                ))}
              </ScrollView>
            </MenuOptions>
          </Menu>
          <View style={styles.spacer} />
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const { dispatch, commentPlayer } = this.props;
              const { autoScroll } = commentPlayer;
              dispatch(CommentPlayerActions.setAutoScroll(!autoScroll));
            }}
          >
            <FontAwesome5Icon
              name="sort-amount-down"
              solid
              color={autoScroll ? active : light}
              size={16}
            />
          </TouchableOpacity>
        </View>
        <FlatList
          style={[styles.container, colorStyle.bgLight]}
          data={data.filter(({ title }) => filters.indexOf(title) >= 0)}
          removeClippedSubviews={Platform.OS !== "web"}
          maxToRenderPerBatch={15}
          updateCellsBatchingPeriod={2000}
          initialNumToRender={15}
          windowSize={3}
          ref={ref => {
            this.list = ref;
            if (this.list) {
              const { commentPlayer } = this.props;
              const { data, pointer } = commentPlayer;
              const item = data[pointer];
              if (item) {
                this.list.scrollToItem({
                  item,
                  animated: false,
                  viewPosition: 1
                });
                this.poniter = pointer;
              }
            }
          }}
          keyExtractor={({ id }) => id}
          renderItem={({ item }) => {
            const { commentPlayer, setting } = this.props;
            const { view = {} } = setting;
            const { hourFirst = "4", hourFormat = "" } = view;

            const dateFormatter = new DateFormatter(
              parseInt(hourFirst, 10),
              hourFormat
            );

            const time = item.time - commentPlayer.start;
            const timeText = formatTime(time);
            const dateTimeText = dateFormatter.format(
              new Date(item.time),
              "HHHH:mm:ss"
            );

            return (
              <Menu>
                <MenuTrigger
                  customStyles={{
                    triggerWrapper: [
                      colorStyle.bgWhite,
                      colorStyle.borderGray,
                      styles.item
                    ]
                  }}
                >
                  <Text style={[colorStyle.black, styles.itemTextSmall]}>
                    {timeText}({dateTimeText}) {item.name}[{item.email}](
                    {item.id})
                  </Text>
                  <Text
                    style={[textStyle.bold, colorStyle.black, styles.itemText]}
                  >
                    {item.text.trim()}
                  </Text>
                  <Text style={[colorStyle.black, styles.itemTextSmall]}>
                    {item.title}
                  </Text>
                </MenuTrigger>
                <MenuOptions
                  customStyles={{
                    optionsContainer: [
                      colorStyle.borderGray,
                      styles.itemMenuContainer
                    ]
                  }}
                >
                  <MenuOption
                    style={[containerStyle.row, colorStyle.bgDark]}
                    onSelect={() => {
                      const { dispatch } = this.props;
                      dispatch(PlayerActions.time(time));
                    }}
                  >
                    <View style={styles.itemMenuIcon}>
                      <FontAwesome5Icon
                        name="clock"
                        solid
                        color={light}
                        size={16}
                      />
                    </View>
                    <Text style={[colorStyle.light, styles.itemMenuTitle]}>
                      {timeText}({dateTimeText})
                    </Text>
                  </MenuOption>
                  <Text
                    style={[
                      textStyle.bold,
                      colorStyle.black,
                      styles.itemMenuContent
                    ]}
                  >
                    {item.text.trim()}
                  </Text>
                  <View style={containerStyle.row}>
                    <Text style={[colorStyle.black, styles.itemMenuName]}>
                      スレッド
                    </Text>
                    <Text style={[colorStyle.black, styles.itemMenuText]}>
                      {item.title}
                    </Text>
                  </View>
                  <View style={containerStyle.row}>
                    <Text style={[colorStyle.black, styles.itemMenuName]}>
                      名前
                    </Text>
                    <Text style={[colorStyle.black, styles.itemMenuText]}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={containerStyle.row}>
                    <Text style={[colorStyle.black, styles.itemMenuName]}>
                      メール
                    </Text>
                    <Text style={[colorStyle.black, styles.itemMenuText]}>
                      {item.email}
                    </Text>
                  </View>
                  <View style={containerStyle.row}>
                    <Text style={[colorStyle.black, styles.itemMenuName]}>
                      ID
                    </Text>
                    <Text style={[colorStyle.black, styles.itemMenuText]}>
                      {item.id}
                    </Text>
                  </View>
                </MenuOptions>
              </Menu>
            );
          }}
          getItemLayout={(data, index) => ({
            index,
            length: 58,
            offset: index * 58
          })}
        />
        <View style={[containerStyle.row, containerStyle.wrap]}>
          <Text style={colorStyle.light}>
            {CommentService.channelToQueries(channel, queryTable).join(",")}
          </Text>
          <Text style={[colorStyle.light, textStyle.right, styles.speedText]}>
            {speed}コメント/分
          </Text>
        </View>
      </View>
    );
  }

  componentDidMount() {
    this.runUpdater();
  }

  shouldComponentUpdate(nextProps: Props) {
    const { commentPlayer } = this.props;
    return (
      nextProps.commentPlayer === commentPlayer ||
      nextProps.commentPlayer.pointer === commentPlayer.pointer ||
      nextProps.commentPlayer.speed !== commentPlayer.speed
    );
  }

  componentWillUnmount() {
    clearTimeout(this.updaterId);
  }

  runUpdater() {
    const { commentPlayer } = this.props;
    const { autoScroll } = commentPlayer;
    if (this.list && autoScroll) {
      const { data, pointer } = commentPlayer;
      const item = data[pointer];
      if (item && pointer > 0 && this.poniter !== pointer) {
        this.list.scrollToItem({ item, viewPosition: 1 });
        this.poniter = pointer;
      }
    }
    this.updaterId = setTimeout(() => {
      this.runUpdater();
    }, updateInterval);
  }
}

export default connect(
  ({
    commentPlayer,
    setting,
    service
  }: {
    commentPlayer: CommentPlayerState;
    setting: SettingState;
    service: ServiceState;
  }) => ({
    commentPlayer,
    setting,
    service
  })
)(CommentInfo);

const updateInterval = 2000;
const textNowrap = Platform.OS === "web" ? { whiteSpace: "nowrap" } : {};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
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
    flex: 1
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
  speedText: {
    marginLeft: "auto"
  }
});
