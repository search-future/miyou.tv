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

import React, { memo, useContext, useMemo, useCallback } from "react";
import { ScrollView, View, StyleSheet, Platform } from "react-native";
import { Card, Text, Badge, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import Toast from "react-native-root-toast";

import DateFormatter from "../utils/DateFormatter";
import DownloadButton from "../components/DownloadButton";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { RootState } from "../modules";
import { SettingState } from "../modules/setting";
import { ViewerActions, ViewerProgram } from "../modules/viewer";
import { toastOptions } from "../config/constants";

type Setting = SettingState & {
  view?: {
    hourFirst?: string;
    hourFormat?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const ViewerInfo = memo(() => {
  const hourFirst = useSelector<State, number>(({ setting }) =>
    parseInt(setting.view?.hourFirst || "4", 10)
  );
  const hourFormat = useSelector<State, string>(
    ({ setting }) => setting.view?.hourFormat || ""
  );
  const program = useSelector<State, ViewerProgram | undefined>(
    ({ viewer }) => viewer.programs[viewer.index],
    shallowEqual
  );
  const extraProgram = useSelector<State, ViewerProgram | undefined>(
    ({ viewer }) =>
      viewer.programs[viewer.index]?.recorded?.[viewer.extraIndex],
    shallowEqual
  );

  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );

  return (
    <ScrollView style={containerStyle.container}>
      {program &&
        (program.type === "file" ? (
          <FileCard dateFormatter={dateFormatter} {...program} />
        ) : (
          <ProgramCard dateFormatter={dateFormatter} {...program} />
        ))}
      {extraProgram && (
        <ExtraProgramCard dateFormatter={dateFormatter} {...extraProgram} />
      )}
    </ScrollView>
  );
});
export default ViewerInfo;

const FileCard = memo(
  ({
    id,
    channelName,
    fullTitle,
    start,
    stream,
    dateFormatter = new DateFormatter()
  }: ViewerProgram & {
    dateFormatter?: DateFormatter;
  }) => {
    const { theme } = useContext(ThemeContext);

    return (
      <Card
        containerStyle={[
          {
            backgroundColor: theme.colors?.controlBg,
            borderColor: theme.colors?.controlBorder
          }
        ]}
      >
        <>
          <Card.Title style={[{ color: theme.colors?.control }]}>
            ファイル情報
          </Card.Title>
          <Card.Divider
            style={[{ backgroundColor: theme.colors?.controlBorder }]}
          ></Card.Divider>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>ID</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>{id}</Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>ファイル名</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {fullTitle}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>日時</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {dateFormatter.format(start, "YYYY/MM/DD(dd) A HHHH:mm")}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>チャンネル</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {channelName || "未設定"}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>URI</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>{stream}</Text>
            </View>
          </View>
        </>
      </Card>
    );
  }
);
const ProgramCard = memo(
  ({
    id,
    type,
    channel,
    channelName,
    title,
    fullTitle,
    detail,
    category,
    start,
    end,
    commentCount,
    commentSpeed,
    commentMaxSpeed,
    commentMaxSpeedTime,
    download,
    dateFormatter = new DateFormatter()
  }: ViewerProgram & {
    dateFormatter: DateFormatter;
  }) => {
    const dispatch = useDispatch();

    const { theme } = useContext(ThemeContext);

    const titleSearch = useCallback(() => {
      dispatch(ViewerActions.search(title));
    }, [title]);
    const channelSearch = useCallback(() => {
      dispatch(ViewerActions.search(`type:${type} ch:${channel}`));
    }, [type, channel]);
    const categorySearch = useCallback(() => {
      dispatch(ViewerActions.search(`cat:${category.codeName}`));
    }, [category]);
    const onDownloadSuccess = useCallback(() => {
      Toast.show("Download complete!", {
        ...toastOptions,
        duration: Toast.durations.SHORT
      });
    }, []);
    const onDownloadFailure = useCallback((e: any) => {
      Toast.show(e?.message, {
        ...toastOptions,
        duration: Toast.durations.SHORT
      });
    }, []);
    const downloadRenderer = useCallback(
      ({
        name,
        uri,
        filename,
        size
      }: {
        name: string;
        uri: string;
        filename: string;
        size?: number;
      }) => (
        <DownloadButton
          key={uri}
          title={name}
          source={{
            uri,
            size,
            filename:
              Platform.OS === "ios"
                ? filename.replace(/\.m2ts$/, ".ts")
                : filename
          }}
          color={theme.colors?.control}
          backgroundColor={theme.colors?.controlBgActive}
          borderColor={theme.colors?.controlBorder}
          buttonColor={theme.colors?.controlBg}
          progressColor={theme.colors?.selected}
          successColor={theme.colors?.primary}
          onSuccess={onDownloadSuccess}
          onFailure={onDownloadFailure}
        />
      ),
      [download]
    );

    return (
      <Card
        containerStyle={[
          {
            backgroundColor: theme.colors?.controlBg,
            borderColor: theme.colors?.controlBorder
          }
        ]}
      >
        <>
          <Card.Title style={[{ color: theme.colors?.control }]}>
            番組情報
          </Card.Title>
          <Card.Divider
            style={[{ backgroundColor: theme.colors?.controlBorder }]}
          ></Card.Divider>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[textStyle.bold, { color: theme.colors?.control }]}>
                {fullTitle}
              </Text>
              <FontAwesome5Icon
                name="search"
                solid
                style={styles.icon}
                color={theme.colors?.control}
                onPress={titleSearch}
              />
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>ID</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>{id}</Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>開始日時</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {dateFormatter.format(start, "YYYY/MM/DD(dd) A HHHH:mm")}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>終了日時</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {dateFormatter.format(end, "YYYY/MM/DD(dd) A HHHH:mm")}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>チャンネル</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {channelName}
              </Text>
              <FontAwesome5Icon
                name="search"
                solid
                style={styles.icon}
                color={theme.colors?.control}
                onPress={channelSearch}
              />
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>カテゴリー</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Badge
                badgeStyle={[
                  styles.badge,
                  {
                    backgroundColor: category.color,
                    borderColor: theme.colors?.controlBorder
                  }
                ]}
                value={category.name}
              />
              <FontAwesome5Icon
                name="search"
                solid
                style={styles.icon}
                color={theme.colors?.control}
                onPress={categorySearch}
              />
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>{detail}</Text>
            </View>
          </View>
          {commentCount != null && (
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={[{ color: theme.colors?.control }]}>
                  コメント数
                </Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={[{ color: theme.colors?.control }]}>
                  {commentCount}
                </Text>
              </View>
            </View>
          )}
          {commentSpeed != null && (
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={[{ color: theme.colors?.control }]}> 平均</Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={[{ color: theme.colors?.control }]}>
                  {Math.ceil((commentSpeed || 0) * 10) / 10}
                  コメント/分
                </Text>
              </View>
            </View>
          )}
          {commentMaxSpeedTime && (
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={[{ color: theme.colors?.control }]}> ピーク</Text>
              </View>
              <View style={[containerStyle.row, styles.cardContent]}>
                <Text style={[{ color: theme.colors?.control }]}>
                  {commentMaxSpeed || 0}コメント/分 (
                  {dateFormatter.format(commentMaxSpeedTime, "HHHH:mm")})
                </Text>
              </View>
            </View>
          )}
          {download && (
            <View style={[containerStyle.row, styles.cardRow]}>
              <View style={styles.cardLabel}>
                <Text style={[{ color: theme.colors?.control }]}>
                  ダウンロード
                </Text>
              </View>
              <View style={[styles.cardContent]}>
                {download.map(downloadRenderer)}
              </View>
            </View>
          )}
        </>
      </Card>
    );
  }
);
const ExtraProgramCard = memo(
  ({
    id,
    fullTitle,
    channelName,
    start,
    end,
    dateFormatter = new DateFormatter()
  }: ViewerProgram & {
    dateFormatter?: DateFormatter;
  }) => {
    const { theme } = useContext(ThemeContext);

    return (
      <Card
        containerStyle={[
          {
            backgroundColor: theme.colors?.controlBg,
            borderColor: theme.colors?.controlBorder
          }
        ]}
      >
        <>
          <Card.Title style={[{ color: theme.colors?.control }]}>
            録画情報
          </Card.Title>
          <Card.Divider
            style={[{ backgroundColor: theme.colors?.controlBorder }]}
          ></Card.Divider>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>ID</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>{id}</Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>タイトル</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {fullTitle}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>チャンネル</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {channelName}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>開始日時</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {dateFormatter.format(start, "YYYY/MM/DD(dd) A HHHH:mm")}
              </Text>
            </View>
          </View>
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={[{ color: theme.colors?.control }]}>終了日時</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={[{ color: theme.colors?.control }]}>
                {dateFormatter.format(end, "YYYY/MM/DD(dd) A HHHH:mm")}
              </Text>
            </View>
          </View>
        </>
      </Card>
    );
  }
);

const styles = StyleSheet.create({
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
