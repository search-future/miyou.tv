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
  useEffect,
  useContext,
  useMemo,
  useCallback,
  useRef,
  ReactText
} from "react";
import {
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform
} from "react-native";
import { Input, Text, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import qs from "qs";

import IconSelector from "../components/IconSelector";
import LinkText from "../components/LinkText";
import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { SettingActions } from "../modules/setting";
import { ServiceActions } from "../modules/service";
import { garaponDevId, garaponEntryUrl } from "../config/constants";

const Setup = () => {
  const hasBackendChanges = useRef(false);
  const hasMoritapoChanges = useRef(false);

  const navigation = useNavigation();

  const dispatch = useDispatch();
  const backendSetting = useSelector<RootState, any>(
    ({ setting }) => setting?.backend || {},
    shallowEqual
  );
  const commentSetting = useSelector<RootState, any>(
    ({ setting }) => setting?.comment || {},
    shallowEqual
  );
  const viewSetting = useSelector<RootState, any>(
    ({ setting }) => setting?.view || {},
    shallowEqual
  );

  const { theme } = useContext(ThemeContext);

  useEffect(
    () => () => {
      dispatch(SettingActions.update("isConfigured", true));
      if (hasMoritapoChanges.current) {
        dispatch(ServiceActions.commentInit());
        dispatch(ServiceActions.backendInit());
      } else if (hasBackendChanges.current) {
        dispatch(ServiceActions.backendInit());
      }
    },
    []
  );

  const back = useCallback(() => {
    navigation.goBack();
  }, []);
  const onBackendChanged = useCallback(data => {
    dispatch(SettingActions.update("backend", data));
    hasBackendChanges.current = true;
  }, []);
  const onMoritapoChanged = useCallback(data => {
    dispatch(SettingActions.update("comment", data));
    hasMoritapoChanges.current = true;
  }, []);
  const onViewChanged = useCallback(data => {
    dispatch(SettingActions.update("view", data));
  }, []);

  return (
    <View style={[containerStyle.container]}>
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
            color={theme.colors?.control}
            size={24}
          />
        </TouchableOpacity>
        <Text h2 style={[{ color: theme.colors?.control }]}>
          MiyouTVの設定
        </Text>
      </View>
      <ScrollView
        style={[containerStyle.container]}
        contentContainerStyle={[containerStyle.row, containerStyle.wrap]}
      >
        <BackendSetup data={backendSetting} onChanged={onBackendChanged} />
        <CommentSetup data={commentSetting} onChanged={onMoritapoChanged} />
        <ViewSetup data={viewSetting} onChanged={onViewChanged} />
      </ScrollView>
    </View>
  );
};
export default Setup;

const BackendSetup = memo(
  ({ data, onChanged }: { data: any; onChanged?: (data: any) => void }) => {
    const {
      type: backendType = "chinachu",
      auth = false,
      version = "3",
      url = "",
      user = "",
      password = "",
      streamType = "m2ts",
      streamParams = "c:v=copy&c:a=copy",
      mobileStreamType = "mp4",
      mobileStreamParams = "b:v=1M&b:a=128k&s=1280x720",
      reloadIntervalSeconds = "0"
    } = data;

    const { theme } = useContext(ThemeContext);

    const {
      "c:v": videoCodec = "",
      "c:a": audioCodec = "",
      "b:v": videoBitrate = "",
      "b:a": audioBitrate = "",
      s: videoSize = "",
      type: videoType = "ts",
      name: videoName = "",
      mode: streamMode = "0"
    }: {
      "c:v"?: string;
      "c:a"?: string;
      "b:v"?: string;
      "b:a"?: string;
      s?: string;
      type?: string;
      name?: string;
      mode?: string;
    } = useMemo(() => qs.parse(streamParams), [streamParams]);
    const {
      "b:v": mobileVideoBitrate = "",
      "b:a": mobileAudioBitrate = "",
      s: mobileVideoSize = "",
      mode: mobileStreamMode = "0"
    }: {
      "b:v"?: string;
      "b:a"?: string;
      s?: string;
      mode?: string;
    } = useMemo(() => qs.parse(mobileStreamParams), [mobileStreamParams]);

    const backendTypeChange = useCallback(
      (type: ReactText) => {
        if (onChanged && type !== backendType) {
          let streamType = "";
          let streamParams = "";
          let mobileStreamType = "";
          let mobileStreamParams = "";
          if (type === "chinachu") {
            streamType = "m2ts";
            streamParams = "c:v=copy&c:a=copy";
            mobileStreamType = "mp4";
            mobileStreamParams = "b:v=1M&b:a=128k&s=1280x720";
          } else if (type === "epgstation") {
            streamType = "raw";
            streamParams = "";
            mobileStreamType = "mp4";
            mobileStreamParams = "mode=0";
          }
          onChanged({
            type,
            auth: type === "garapon",
            version: type === "garapon" ? "3" : "",
            url: "",
            user: "",
            password: "",
            streamType,
            streamParams,
            mobileStreamType,
            mobileStreamParams
          });
        }
      },
      [backendType, onChanged]
    );
    const backendAuthChange = useCallback(
      (auth: boolean) => {
        if (onChanged) {
          if (auth) {
            onChanged({ auth });
          } else {
            onChanged({
              auth,
              user: "",
              password: ""
            });
          }
        }
      },
      [onChanged]
    );
    const versionChange = useCallback(
      (version: string) => {
        if (onChanged) {
          onChanged({ version });
        }
      },
      [onChanged]
    );
    const urlChange = useCallback(
      (url: string) => {
        if (onChanged) {
          onChanged({ url });
        }
      },
      [onChanged]
    );
    const userChange = useCallback(
      (user: string) => {
        if (onChanged) {
          onChanged({ user });
        }
      },
      [onChanged]
    );
    const passwordChange = useCallback(
      (password: string) => {
        if (onChanged) {
          onChanged({ password });
        }
      },
      [onChanged]
    );
    const streamTypeChange = useCallback(
      (streamType: ReactText) => {
        if (onChanged) {
          switch (backendType) {
            case "epgstation":
              if (streamType === "raw") {
                onChanged({
                  streamType,
                  streamParams: "",
                  mobileStreamType: "mp4",
                  mobileStreamParams: "mode=0"
                });
              } else {
                onChanged({
                  streamType,
                  streamParams: "mode=0",
                  mobileStreamType: "mp4",
                  mobileStreamParams: "mode=0"
                });
              }
              break;
            case "chinachu":
              if (streamType === "m2ts") {
                onChanged({
                  streamType,
                  streamParams: "c:v=copy&c:a=copy"
                });
              } else {
                onChanged({
                  streamType,
                  streamParams: "b:v=1M&b:a=128k&s=1280x720"
                });
              }
              break;
            default:
          }
        }
      },
      [backendType, onChanged]
    );
    const streamParamsChange = useCallback(
      (streamParams: string) => {
        if (onChanged) {
          onChanged({ streamParams });
        }
      },
      [onChanged]
    );
    const videoCodecChange = useCallback(
      (videoCodec: ReactText) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              {
                ...qs.parse(streamParams),
                "c:v": videoCodec || null,
                ...(videoCodec === "copy" ? { s: null, "b:v": null } : {})
              },
              qsStringfyOptions
            )
          });
        }
      },
      [streamParams, onChanged]
    );
    const videoSizeChange = useCallback(
      (videoSize: ReactText) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              { ...qs.parse(streamParams), s: videoSize || null },
              qsStringfyOptions
            )
          });
        }
      },
      [streamParams, onChanged]
    );
    const videoBitrateChange = useCallback(
      (videoBitrate: ReactText) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              {
                ...qs.parse(streamParams, {}),
                "b:v": videoBitrate || null
              },
              qsStringfyOptions
            )
          });
        }
      },
      [streamParams, onChanged]
    );
    const audioCodecChange = useCallback(
      (audioCodec: ReactText) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              {
                ...qs.parse(streamParams),
                "c:a": audioCodec || null,
                ...(audioCodec === "copy" ? { "b:a": null } : {})
              },
              qsStringfyOptions
            )
          });
        }
      },
      [streamParams, onChanged]
    );
    const audioBitrateChange = useCallback(
      (audioBitrate: ReactText) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              {
                ...qs.parse(streamParams),
                "b:a": audioBitrate || null
              },
              qsStringfyOptions
            )
          });
        }
      },
      [streamParams, onChanged]
    );
    const videoTypeChange = useCallback(
      (type: ReactText) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              { ...qs.parse(streamParams), type },
              qsStringfyOptions
            ),
            mobileStreamType: "mp4"
          });
        }
      },
      [streamParams, onChanged]
    );
    const videoNameChange = useCallback(
      (name: string) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              { ...qs.parse(streamParams), name },
              qsStringfyOptions
            )
          });
        }
      },
      [streamParams, onChanged]
    );
    const streamModeChange = useCallback(
      (mode: string) => {
        if (onChanged) {
          onChanged({
            streamParams: qs.stringify(
              { ...qs.parse(streamParams), mode },
              qsStringfyOptions
            )
          });
        }
      },
      [streamParams, onChanged]
    );
    const mobileStreamTypeChange = useCallback(
      (mobileStreamType: ReactText) => {
        if (onChanged) {
          switch (backendType) {
            case "epgstation":
              onChanged({
                mobileStreamType,
                mobileStreamParams: mobileStreamType === "raw" ? "" : "mode=0"
              });
              break;
            case "chinachu":
              onChanged({
                mobileStreamType,
                mobileStreamParams: "b:v=1M&b:a=128k&s=1280x720"
              });
              break;
            default:
          }
        }
      },
      [backendType, onChanged]
    );
    const mobileStreamParamsChange = useCallback(
      (mobileStreamParams: string) => {
        if (onChanged) {
          onChanged({ mobileStreamParams });
        }
      },
      [onChanged]
    );
    const mobileVideoSizeChange = useCallback(
      (videoSize: ReactText) => {
        if (onChanged) {
          onChanged({
            mobileStreamParams: qs.stringify(
              { ...qs.parse(mobileStreamParams), s: videoSize || null },
              qsStringfyOptions
            )
          });
        }
      },
      [mobileStreamParams, onChanged]
    );
    const mobileVideoBitrateChange = useCallback(
      (videoBitrate: ReactText) => {
        if (onChanged) {
          onChanged({
            mobileStreamParams: qs.stringify(
              {
                ...qs.parse(mobileStreamParams, {}),
                "b:v": videoBitrate || null
              },
              qsStringfyOptions
            )
          });
        }
      },
      [mobileStreamParams, onChanged]
    );
    const mobileAudioBitrateChange = useCallback(
      (audioBitrate: ReactText) => {
        if (onChanged) {
          onChanged({
            mobileStreamParams: qs.stringify(
              {
                ...qs.parse(mobileStreamParams),
                "b:a": audioBitrate || null
              },
              qsStringfyOptions
            )
          });
        }
      },
      [mobileStreamParams, onChanged]
    );
    const mobileStreamModeChange = useCallback(
      (mode: string) => {
        if (onChanged) {
          onChanged({
            mobileStreamParams: qs.stringify(
              {
                ...qs.parse(mobileStreamParams),
                mode
              },
              qsStringfyOptions
            )
          });
        }
      },
      [mobileStreamParams, onChanged]
    );
    const reloadIntervalSecondsChange = useCallback(
      (reloadIntervalSeconds: string) => {
        if (onChanged && !isNaN(reloadIntervalSeconds as any)) {
          onChanged({ reloadIntervalSeconds });
        }
      },
      [onChanged]
    );

    return (
      <View style={styles.group}>
        <Text h3>バックエンド</Text>
        <Text>バックエンドの種類</Text>
        <IconSelector
          containerStyle={[
            styles.inputWrapper,
            {
              backgroundColor: theme.colors?.background,
              borderColor: theme.colors?.border
            }
          ]}
          style={{ backgroundColor: theme.colors?.background }}
          color={theme.colors?.default}
          items={[
            { label: "Chinachu", value: "chinachu" },
            { label: "EPGStation", value: "epgstation" },
            { label: "mirakc(タイムシフト録画)", value: "mirakc" },
            ...(garaponDevId
              ? [
                  {
                    label: "ガラポンTV API Ver.3 (～伍号機)",
                    value: "garapon"
                  },
                  {
                    label: "ガラポンTV API Ver.4 (六号機～)",
                    value: "garaponv4"
                  }
                ]
              : [])
          ]}
          selectedValue={backendType}
          onValueChange={backendTypeChange}
        />
        {backendType === "chinachu" && (
          <>
            <View style={styles.info}>
              {Platform.OS === "ios" ? (
                <Text>Chinachu β/γに対応しています。</Text>
              ) : (
                <LinkText url={chinachuInfoUrl}>
                  Chinachu β/γに対応しています。
                </LinkText>
              )}
            </View>
            <Input
              label="ChinachuのURL"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              placeholder="http://127.0.0.1:20772/"
              textContentType="URL"
              value={url}
              onChangeText={urlChange}
            />
            <Text>ユーザー名とパスワードを使用する</Text>
            <View style={containerStyle.row}>
              <Switch value={auth} onValueChange={backendAuthChange} />
            </View>
            {auth && (
              <>
                <Input
                  label="Chinachuのユーザー"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  textContentType="username"
                  value={user}
                  onChangeText={userChange}
                />
                <Input
                  label="Chinachuのパスワード"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  textContentType="password"
                  secureTextEntry
                  value={password}
                  onChangeText={passwordChange}
                />
              </>
            )}
            <Text>動画コンテナ</Text>
            <IconSelector
              containerStyle={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors?.background,
                  borderColor: theme.colors?.border
                }
              ]}
              style={{ backgroundColor: theme.colors?.background }}
              color={theme.colors?.default}
              items={[
                { label: "MPEG2-TS", value: "m2ts" },
                { label: "MP4", value: "mp4" }
              ]}
              selectedValue={streamType}
              onValueChange={streamTypeChange}
            />
            <Input
              label="動画オプション"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              value={streamParams}
              onChangeText={streamParamsChange}
            />
            {streamType === "m2ts" && (
              <>
                <Text>映像コーデック</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "自動", value: "" },
                    { label: "無変換", value: "copy" },
                    { label: "H.264", value: "libx264" },
                    { label: "MPEG-2", value: "mpeg2video" }
                  ]}
                  selectedValue={videoCodec}
                  onValueChange={videoCodecChange}
                />
              </>
            )}
            {videoCodec !== "copy" && (
              <>
                <Text>動画解像度</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "", value: "" },
                    { label: "576p(WSVGA)", value: "1024x576" },
                    { label: "720p(HD)", value: "1280x720" },
                    { label: "1080p(FHD)", value: "1920x1080" }
                  ]}
                  selectedValue={videoSize}
                  onValueChange={videoSizeChange}
                />
              </>
            )}
            {videoCodec !== "copy" && (
              <>
                <Text>映像ビットレート</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "", value: "" },
                    { label: "3Mbps", value: "3M" },
                    { label: "2Mbps", value: "2M" },
                    { label: "1Mbps", value: "1M" },
                    { label: "512kbps", value: "512k" },
                    { label: "256kbps", value: "256k" }
                  ]}
                  selectedValue={videoBitrate}
                  onValueChange={videoBitrateChange}
                />
              </>
            )}
            {streamType === "m2ts" && (
              <>
                <Text>音声コーデック</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "自動", value: "" },
                    { label: "無変換", value: "copy" },
                    { label: "AAC", value: "libfdk_aac" },
                    { label: "Vorbis", value: "libvorbis" }
                  ]}
                  selectedValue={audioCodec}
                  onValueChange={audioCodecChange}
                />
              </>
            )}
            {audioCodec !== "copy" && (
              <>
                <Text>音声ビットレート</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "", value: "" },
                    { label: "192kbps", value: "192k" },
                    { label: "128kbps", value: "128k" },
                    { label: "64kbps", value: "64k" }
                  ]}
                  selectedValue={audioBitrate}
                  onValueChange={audioBitrateChange}
                />
              </>
            )}
            {Platform.OS !== "web" && (
              <>
                <Text>動画コンテナ(モバイルデータ通信)</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[{ label: "MP4", value: "mp4" }]}
                  selectedValue={mobileStreamType}
                  onValueChange={mobileStreamTypeChange}
                />
                <Input
                  label="動画オプション(モバイルデータ通信)"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  value={mobileStreamParams}
                  onChangeText={mobileStreamParamsChange}
                />
                <Text>動画解像度(モバイルデータ通信)</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "", value: "" },
                    { label: "576p(WSVGA)", value: "1024x576" },
                    { label: "720p(HD)", value: "1280x720" },
                    { label: "1080p(FHD)", value: "1920x1080" }
                  ]}
                  selectedValue={mobileVideoSize}
                  onValueChange={mobileVideoSizeChange}
                />
                <Text>映像ビットレート(モバイルデータ通信)</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "", value: "" },
                    { label: "3Mbps", value: "3M" },
                    { label: "2Mbps", value: "2M" },
                    { label: "1Mbps", value: "1M" },
                    { label: "512kbps", value: "512k" },
                    { label: "256kbps", value: "256k" }
                  ]}
                  selectedValue={mobileVideoBitrate}
                  onValueChange={mobileVideoBitrateChange}
                />
                <Text>音声ビットレート(モバイルデータ通信)</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    { label: "", value: "" },
                    { label: "192kbps", value: "192k" },
                    { label: "128kbps", value: "128k" },
                    { label: "64kbps", value: "64k" }
                  ]}
                  selectedValue={mobileAudioBitrate}
                  onValueChange={mobileAudioBitrateChange}
                />
              </>
            )}
          </>
        )}
        {backendType === "epgstation" && (
          <>
            <View style={styles.info}>
              {Platform.OS === "ios" ? (
                <Text>EPGStation v1/v2に対応しています。</Text>
              ) : (
                <LinkText url={epgstationInfoUrl}>
                  EPGStation v1/v2に対応しています。
                </LinkText>
              )}
            </View>
            <Input
              label="EPGStationのURL"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              placeholder="http://127.0.0.1:8888/"
              textContentType="URL"
              value={url}
              onChangeText={urlChange}
            />
            <Text>ユーザー名とパスワードを使用する</Text>
            <View style={containerStyle.row}>
              <Switch value={auth} onValueChange={backendAuthChange} />
            </View>
            {auth && (
              <>
                <Input
                  label="EPGStationのユーザー"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  textContentType="username"
                  value={user}
                  onChangeText={userChange}
                />
                <Input
                  label="EPGStationのパスワード"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  textContentType="password"
                  secureTextEntry
                  value={password}
                  onChangeText={passwordChange}
                />
              </>
            )}
            <Text>
              {streamType === "raw"
                ? "再生するビデオファイル"
                : "再生するビデオファイル(v2以降で有効)"}
            </Text>
            <IconSelector
              containerStyle={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors?.background,
                  borderColor: theme.colors?.border
                }
              ]}
              style={{ backgroundColor: theme.colors?.background }}
              color={theme.colors?.default}
              items={[
                { label: "TS", value: "ts" },
                { label: "エンコード済", value: "encoded" }
              ]}
              selectedValue={videoType}
              onValueChange={videoTypeChange}
            />
            <Input
              label="再生するビデオ名"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              placeholder="TS"
              value={videoName}
              onChangeText={videoNameChange}
            />
            <Text>動画コンテナ</Text>
            <IconSelector
              containerStyle={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors?.background,
                  borderColor: theme.colors?.border
                }
              ]}
              style={{ backgroundColor: theme.colors?.background }}
              color={theme.colors?.default}
              items={[
                { label: "直接再生", value: "raw" },
                { label: "MP4", value: "mp4" },
                { label: "WebM", value: "webm" },
                { label: "MPEG2-TS", value: "mpegts" }
              ]}
              selectedValue={streamType}
              onValueChange={streamTypeChange}
            />
            {streamType !== "raw" && (
              <Input
                label="ストリーミング設定"
                inputContainerStyle={[styles.inputWrapper]}
                autoCapitalize="none"
                value={streamMode}
                onChangeText={streamModeChange}
              />
            )}
            {Platform.OS !== "web" && (
              <>
                <Text>動画コンテナ(モバイルデータ通信)</Text>
                <IconSelector
                  containerStyle={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors?.background,
                      borderColor: theme.colors?.border
                    }
                  ]}
                  style={{ backgroundColor: theme.colors?.background }}
                  color={theme.colors?.default}
                  items={[
                    ...(videoType === "encoded" && streamType === "raw"
                      ? [{ label: "直接再生", value: "raw" }]
                      : []),
                    { label: "MP4", value: "mp4" },
                    { label: "WebM", value: "webm" }
                  ]}
                  selectedValue={mobileStreamType}
                  onValueChange={mobileStreamTypeChange}
                />
                <Input
                  label="ストリーミング設定(モバイルデータ通信)"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  value={mobileStreamMode}
                  onChangeText={mobileStreamModeChange}
                />
              </>
            )}
          </>
        )}
        {backendType === "mirakc" && (
          <>
            <View style={styles.info}>
              {Platform.OS === "ios" ? (
                <Text>mirakcのタイムシフト録画に対応しています。</Text>
              ) : (
                <LinkText url={mirakcInfoUrl}>
                  mirakcのタイムシフト録画に対応しています。
                </LinkText>
              )}
            </View>
            <Input
              label="mirakcのURL"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              placeholder="http://127.0.0.1:40772/"
              keyboardType="url"
              textContentType="URL"
              value={url}
              onChangeText={urlChange}
            />
            <Text>ユーザー名とパスワードを使用する</Text>
            <View style={containerStyle.row}>
              <Switch value={auth} onValueChange={backendAuthChange} />
            </View>
            {auth && (
              <>
                <Input
                  label="mirakcのユーザー"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  textContentType="username"
                  value={user}
                  onChangeText={userChange}
                />
                <Input
                  label="mirakcのパスワード"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  textContentType="password"
                  secureTextEntry
                  value={password}
                  onChangeText={passwordChange}
                />
              </>
            )}
          </>
        )}
        {backendType === "garapon" && (
          <>
            <View style={styles.info}>
              <Text>ガラポン伍/四/参号機に対応しています。</Text>
              {Platform.OS !== "ios" && (
                <LinkText url={garaponEntryUrl}>
                  ガラポンTVレンタル申込ページ
                </LinkText>
              )}
            </View>
            <Text>ガラポンTVの接続情報をAPIから取得</Text>
            <View style={containerStyle.row}>
              <Switch value={auth} onValueChange={backendAuthChange} />
            </View>
            {!auth && (
              <>
                <Input
                  label="ガラポンTVのURL"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  keyboardType="url"
                  textContentType="URL"
                  value={url}
                  onChangeText={urlChange}
                />
                <Input
                  label="ガラポンTVのAPIバージョン"
                  inputContainerStyle={[styles.inputWrapper]}
                  autoCapitalize="none"
                  keyboardType="numeric"
                  value={version}
                  onChangeText={versionChange}
                />
              </>
            )}
            <Input
              label="ガラポンTVのユーザー"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              textContentType="username"
              value={user}
              onChangeText={userChange}
            />
            <Input
              label="ガラポンTVのパスワード"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              textContentType="password"
              secureTextEntry
              value={password}
              onChangeText={passwordChange}
            />
          </>
        )}
        {backendType === "garaponv4" && (
          <>
            <View style={styles.info}>
              <Text>ガラポン六号機に対応しています。</Text>
              {Platform.OS !== "ios" && (
                <LinkText url={garaponEntryUrl}>
                  ガラポンTVレンタル申込ページ
                </LinkText>
              )}
            </View>
            <Input
              label="ガラポンTVのパスワード"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              textContentType="username"
              value={user}
              onChangeText={userChange}
            />
            <Input
              label="ガラポンTVのパスワード"
              inputContainerStyle={[styles.inputWrapper]}
              autoCapitalize="none"
              textContentType="password"
              secureTextEntry
              value={password}
              onChangeText={passwordChange}
            />
          </>
        )}
        <Input
          label="自動更新間隔(秒)"
          inputContainerStyle={[styles.inputWrapper]}
          autoCapitalize="none"
          keyboardType="number-pad"
          textContentType="none"
          value={reloadIntervalSeconds}
          onChangeText={reloadIntervalSecondsChange}
        />
      </View>
    );
  }
);

const CommentSetup = memo(
  ({ data, onChanged }: { data: any; onChanged?: (data: any) => void }) => {
    const { email = "", password = "" } = data;

    useContext(ThemeContext);

    const emailChange = useCallback(
      (email: string) => {
        if (onChanged) {
          onChanged({ email });
        }
      },
      [onChanged]
    );
    const passwordChange = useCallback(
      (password: string) => {
        if (onChanged) {
          onChanged({ password });
        }
      },
      [onChanged]
    );

    return (
      <View style={styles.group}>
        <Text h3>モリタポアカウント</Text>
        <View style={styles.info}>
          <Text>コメントを表示するにはモリタポアカウントが必要です。</Text>
          {Platform.OS !== "ios" && (
            <LinkText url={moritapoEntryUrl}>モリタポ新規入会ページ</LinkText>
          )}
        </View>
        <Input
          label="メールアドレス"
          inputContainerStyle={[styles.inputWrapper]}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={emailChange}
        />
        <Input
          label="パスワード"
          inputContainerStyle={[styles.inputWrapper]}
          autoCapitalize="none"
          textContentType="password"
          secureTextEntry
          value={password}
          onChangeText={passwordChange}
        />
      </View>
    );
  }
);

const ViewSetup = memo(
  ({ data, onChanged }: { data: any; onChanged?: (data: any) => void }) => {
    const {
      colorScheme = "",
      countMode = "speed",
      hourFirst = "4",
      hourFormat = ""
    } = data;

    const { theme } = useContext(ThemeContext);

    const colorSchemeChange = useCallback(
      (colorScheme: ReactText) => {
        if (onChanged) {
          onChanged({ colorScheme });
        }
      },
      [onChanged]
    );
    const countModeChange = useCallback(
      (countMode: ReactText) => {
        if (onChanged) {
          onChanged({ countMode });
        }
      },
      [onChanged]
    );
    const hourFirstChange = useCallback(
      (hourFirst: ReactText) => {
        if (onChanged) {
          onChanged({ hourFirst });
        }
      },
      [onChanged]
    );
    const hourFormatChange = useCallback(
      (hourFormat: ReactText) => {
        if (onChanged) {
          onChanged({ hourFormat });
        }
      },
      [onChanged]
    );

    return (
      <View style={styles.group}>
        <Text h3>表示設定</Text>
        <Text>テーマ</Text>
        <IconSelector
          containerStyle={[
            styles.inputWrapper,
            {
              backgroundColor: theme.colors?.background,
              borderColor: theme.colors?.border
            }
          ]}
          style={{ backgroundColor: theme.colors?.background }}
          color={theme.colors?.default}
          items={[
            { label: "自動", value: "" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" }
          ]}
          selectedValue={colorScheme}
          onValueChange={colorSchemeChange}
        />
        <Text>表示するカウント</Text>
        <IconSelector
          containerStyle={[
            styles.inputWrapper,
            {
              backgroundColor: theme.colors?.background,
              borderColor: theme.colors?.border
            }
          ]}
          style={{ backgroundColor: theme.colors?.background }}
          color={theme.colors?.default}
          items={[
            { label: "コメント数", value: "comment" },
            { label: "勢い(コメント数/分)", value: "speed" },
            { label: "最大勢い(コメント数/分)", value: "maxspeed" },
            { label: "非表示", value: "none" }
          ]}
          selectedValue={countMode}
          onValueChange={countModeChange}
        />
        <Text>日付を変更する時刻</Text>
        <IconSelector
          containerStyle={[
            styles.inputWrapper,
            {
              backgroundColor: theme.colors?.background,
              borderColor: theme.colors?.border
            }
          ]}
          style={{ backgroundColor: theme.colors?.background }}
          color={theme.colors?.default}
          items={[
            { label: "0時", value: "0" },
            { label: "1時", value: "1" },
            { label: "2時", value: "2" },
            { label: "3時", value: "3" },
            { label: "4時", value: "4" },
            { label: "5時", value: "5" },
            { label: "6時", value: "6" },
            { label: "7時", value: "7" },
            { label: "9時", value: "8" },
            { label: "9時", value: "9" },
            { label: "10時", value: "10" },
            { label: "11時", value: "11" },
            { label: "12時", value: "12" },
            { label: "13時", value: "13" },
            { label: "14時", value: "14" },
            { label: "15時", value: "15" },
            { label: "16時", value: "16" },
            { label: "17時", value: "17" },
            { label: "18時", value: "18" },
            { label: "19時", value: "19" },
            { label: "20時", value: "20" },
            { label: "21時", value: "21" },
            { label: "22時", value: "22" },
            { label: "23時", value: "23" }
          ]}
          selectedValue={hourFirst}
          onValueChange={hourFirstChange}
        />
        <Text>時刻フォーマット</Text>
        <IconSelector
          containerStyle={[
            styles.inputWrapper,
            {
              backgroundColor: theme.colors?.background,
              borderColor: theme.colors?.border
            }
          ]}
          style={{ backgroundColor: theme.colors?.background }}
          color={theme.colors?.default}
          items={[
            { label: "0-11時表記", value: "0:12" },
            { label: "1-12時表記", value: "1:12" },
            { label: "0-23時表記", value: "0:24" },
            { label: "1-24時表記", value: "1:24" },
            {
              label: `${hourFirst}-${parseInt(hourFirst, 10) + 23}時表記`,
              value: ""
            }
          ]}
          selectedValue={hourFormat}
          onValueChange={hourFormatChange}
        />
      </View>
    );
  }
);

const moritapoEntryUrl = "https://find.moritapo.jp/moritapo/subscribe.php";
const chinachuInfoUrl = "https://chinachu.moe/";
const epgstationInfoUrl = "https://github.com/l3tnun/EPGStation";
const mirakcInfoUrl = "https://github.com/mirakc/mirakc";

const qsStringfyOptions: qs.IStringifyOptions = {
  encode: false,
  skipNulls: true
};

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
  group: {
    alignSelf: "stretch",
    padding: 16,
    maxWidth: 480,
    width: "100%"
  },
  info: {
    fontSize: 16,
    marginBottom: 8
  },
  inputWrapper: {
    borderWidth: 1,
    height: 36
  }
});
