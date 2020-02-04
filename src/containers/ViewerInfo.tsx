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
import { ScrollView, View, StyleSheet } from "react-native";
import { Card, Text, Badge } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import DateFormatter from "../utils/DateFormatter";
import colorStyle, { light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { SettingState } from "../modules/setting";
import { ViewerState, ViewerActions } from "../modules/viewer";

type Props = {
  dispatch: Dispatch;
  setting: SettingState & {
    view?: {
      hourFirst?: string;
      hourFormat?: string;
    };
  };
  viewer: ViewerState;
};
class ProgramInfo extends Component<Props> {
  render() {
    const { setting, viewer } = this.props;
    const { view = {} } = setting;
    const { hourFirst = "4", hourFormat = "" } = view;
    const { programs, index, extraIndex } = viewer;
    const program = programs[index];

    let extraProgram;
    if (program && program.recorded) {
      extraProgram = program.recorded[extraIndex];
    }

    const dateFormatter = new DateFormatter(
      parseInt(hourFirst, 10),
      hourFormat
    );

    return (
      <ScrollView style={styles.container}>
        {program &&
          (program.type === "file" ? (
            <Card
              containerStyle={[colorStyle.bgDark, colorStyle.borderGrayDark]}
              dividerStyle={colorStyle.bgGrayDark}
              titleStyle={colorStyle.light}
              title="ファイル情報"
            >
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>ID</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>{program.id}</Text>
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>ファイル名</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>{program.fullTitle}</Text>
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>日時</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>
                    {dateFormatter.format(
                      program.start,
                      "YYYY/MM/DD A HHHH:mm"
                    )}
                  </Text>
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>チャンネル</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>
                    {program.channelName || "未設定"}
                  </Text>
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>URI</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>{program.stream}</Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card
              containerStyle={[colorStyle.bgDark, colorStyle.borderGrayDark]}
              dividerStyle={colorStyle.bgGrayDark}
              titleStyle={colorStyle.light}
              title="番組情報"
            >
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={[textStyle.bold, colorStyle.light]}>
                    {program.fullTitle}
                  </Text>
                  <FontAwesome5Icon
                    name="search"
                    solid
                    style={styles.icon}
                    color={light}
                    onPress={() => {
                      const { viewer } = this.props;
                      const { programs, index } = viewer;
                      const { title } = programs[index];
                      this.search(title);
                    }}
                  />
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>ID</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>{program.id}</Text>
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>開始日時</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>
                    {dateFormatter.format(
                      program.start,
                      "YYYY/MM/DD A HHHH:mm"
                    )}
                  </Text>
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>終了日時</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>
                    {dateFormatter.format(program.end, "YYYY/MM/DD A HHHH:mm")}
                  </Text>
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>チャンネル</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>{program.channelName}</Text>
                  <FontAwesome5Icon
                    name="search"
                    solid
                    style={styles.icon}
                    color={light}
                    onPress={() => {
                      const { viewer } = this.props;
                      const { programs, index } = viewer;
                      const { type, channel } = programs[index];
                      this.search(`type:${type} ch:${channel}`);
                    }}
                  />
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={styles.cardLabel}>
                  <Text style={colorStyle.light}>カテゴリー</Text>
                </View>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Badge
                    badgeStyle={[
                      colorStyle.borderGrayDark,
                      styles.badge,
                      {
                        backgroundColor: program.category.color
                      }
                    ]}
                    value={program.category.name}
                  />
                  <FontAwesome5Icon
                    name="search"
                    solid
                    style={styles.icon}
                    color={light}
                    onPress={() => {
                      const { viewer } = this.props;
                      const { programs, index } = viewer;
                      const { category } = programs[index];
                      this.search(`cat:${category.codeName}`);
                    }}
                  />
                </View>
              </View>
              <View style={[containerStyle.row, styles.cardRow]}>
                <View style={[containerStyle.row, styles.cardContent]}>
                  <Text style={colorStyle.light}>{program.detail}</Text>
                </View>
              </View>
              {program.commentCount != null && (
                <View style={[containerStyle.row, styles.cardRow]}>
                  <View style={styles.cardLabel}>
                    <Text style={colorStyle.light}>コメント数</Text>
                  </View>
                  <View style={[containerStyle.row, styles.cardContent]}>
                    <Text style={colorStyle.light}>{program.commentCount}</Text>
                  </View>
                </View>
              )}
              {program.commentSpeed != null && (
                <View style={[containerStyle.row, styles.cardRow]}>
                  <View style={styles.cardLabel}>
                    <Text style={colorStyle.light}> 平均</Text>
                  </View>
                  <View style={[containerStyle.row, styles.cardContent]}>
                    <Text style={colorStyle.light}>
                      {Math.ceil((program.commentSpeed || 0) * 10) / 10}
                      コメント/分
                    </Text>
                  </View>
                </View>
              )}
              {program.commentMaxSpeedTime && (
                <View style={[containerStyle.row, styles.cardRow]}>
                  <View style={styles.cardLabel}>
                    <Text style={colorStyle.light}> ピーク</Text>
                  </View>
                  <View style={[containerStyle.row, styles.cardContent]}>
                    <Text style={colorStyle.light}>
                      {program.commentMaxSpeed || 0}コメント/分 (
                      {dateFormatter.format(
                        program.commentMaxSpeedTime,
                        "HHHH:mm"
                      )}
                      )
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          ))}
        {extraProgram && (
          <Card
            containerStyle={[colorStyle.bgDark, colorStyle.borderGrayDark]}
            dividerStyle={colorStyle.bgGrayDark}
            titleStyle={colorStyle.light}
            title="録画情報"
          >
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={colorStyle.light}>ID</Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={colorStyle.light}>{extraProgram.id}</Text>
              </View>
            </View>
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={colorStyle.light}>タイトル</Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={colorStyle.light}>{extraProgram.fullTitle}</Text>
              </View>
            </View>
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={colorStyle.light}>チャンネル</Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={colorStyle.light}>{extraProgram.channelName}</Text>
              </View>
            </View>
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={colorStyle.light}>開始日時</Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={colorStyle.light}>
                  {dateFormatter.format(
                    new Date(extraProgram.start),
                    "YYYY/MM/DD A HHHH:mm"
                  )}
                </Text>
              </View>
            </View>
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={colorStyle.light}>終了日時</Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={colorStyle.light}>
                  {dateFormatter.format(
                    new Date(extraProgram.end),
                    "YYYY/MM/DD A HHHH:mm"
                  )}
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    );
  }

  search(query: string) {
    const { dispatch } = this.props;
    dispatch(ViewerActions.search(query));
  }
}

export default connect(
  ({ setting, viewer }: { setting: SettingState; viewer: ViewerState }) => ({
    setting,
    viewer
  })
)(ProgramInfo);

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  cardRow: {
    alignItems: "flex-start",
    padding: 1
  },
  cardLabel: {
    flex: 1
  },
  cardContent: {
    flex: 2
  },
  badge: {
    alignSelf: "flex-start"
  },
  icon: {
    padding: 5
  }
});
