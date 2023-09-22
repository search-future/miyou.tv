/*!
Copyright 2016-2023 Brazil Ltd.
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

import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform
} from "react-native";
import ReactNativeBlobUtil, {
  FetchBlobResponse,
  ReactNativeBlobUtilConfig,
  StatefulPromise
} from "react-native-blob-util";

type Props = {
  title: string;
  source: {
    uri: string;
    filename: string;
    size?: number;
  };
  statusText?: {
    stopped?: string;
    started?: string;
    wait?: string;
    success?: string;
    failure?: string;
  };
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  buttonColor?: string;
  progressColor?: string;
  successColor?: string;
  failureColor?: string;
  onSuccess?: () => void;
  onFailure?: (error: any) => void;
};

const DownloadButton = ({
  title,
  statusText = {},
  color = "#000000",
  backgroundColor = "#808080",
  buttonColor = "#00ff00",
  borderColor = "#808080",
  progressColor = "#00800080",
  successColor = "#008000",
  source,
  onSuccess,
  onFailure
}: Props) => {
  const taskRef = useRef<StatefulPromise<FetchBlobResponse>>();
  const [status, setStatus] = useState<"stopped" | "started" | "success">(
    "stopped"
  );
  const [progress, setProgress] = useState<{
    received: number;
    total: number;
  }>();

  const total = useMemo(() => {
    const bytes = progress?.total || source.size;
    if (bytes) {
      if (bytes > 2 ** 30) {
        return `${(bytes / 2 ** 30).toFixed(1)}GB`;
      }
      if (bytes > 2 ** 20) {
        return `${(bytes / 2 ** 20).toFixed(1)}MB`;
      }
      if (bytes > 0) {
        return `${(bytes / 2 ** 10).toFixed(1)}KB`;
      }
    }
    return "";
  }, [progress?.total, source.size]);
  const current = useMemo(() => {
    if (progress?.received) {
      if (progress?.received > 2 ** 30) {
        return `${(progress?.received / 2 ** 30).toFixed(1)}GB`;
      }
      if (progress?.received > 2 ** 20) {
        return `${(progress?.received / 2 ** 20).toFixed(1)}MB`;
      }
      return `${(progress?.received / 2 ** 10).toFixed(1)}KB`;
    }
    return `0KB`;
  }, [progress?.received]);
  const percent = useMemo(
    () =>
      progress && progress.received > 0
        ? (progress.received * 100) / progress.total
        : 0,
    [progress]
  );

  const onPress = useCallback(async () => {
    try {
      const { uri, filename } = source;
      const config: ReactNativeBlobUtilConfig =
        Platform.OS === "android"
          ? { fileCache: true }
          : { path: `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${filename}` };
      taskRef.current = ReactNativeBlobUtil.config(config)
        .fetch("GET", uri)
        .progress((received, total) => {
          setProgress({ received: parseInt(received), total: parseInt(total) });
        });
      setStatus("started");
      const response = await taskRef.current;
      ReactNativeBlobUtil.fs.stat(response.path());
      if (Platform.OS === "android") {
        await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
          { name: filename, parentFolder: "", mimeType: "" },
          "Video",
          response.path()
        );
      }
      if (onSuccess) {
        onSuccess();
      }
      setStatus("success");
    } catch (e) {
      if (onFailure) {
        onFailure(e);
      }
      setStatus("stopped");
    }
  }, [source]);
  const onCancelPress = useCallback(() => {
    taskRef.current?.cancel();
  }, []);

  switch (status) {
    case "started": {
      const { started = `${title} ダウンロード中` } = statusText;
      return (
        <View
          style={[
            styles.container,
            { borderColor, backgroundColor: backgroundColor }
          ]}
        >
          <Text style={[styles.progressText, { color }]}>{started}</Text>
          {Platform.OS !== "ios" && (
            <Text style={[styles.progressText, { color }]}>
              {percent.toFixed(1)}%({current}
              {total && `/${total}`})
            </Text>
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.progress,
              {
                backgroundColor: progressColor,
                right: `${100 - percent}%`
              }
            ]}
          />
          <TouchableOpacity style={styles.cancel} onPress={onCancelPress}>
            <Text style={[styles.text, { color }]}>&times;</Text>
          </TouchableOpacity>
        </View>
      );
    }
    case "success": {
      const { success = `${title} ダウンロード完了` } = statusText;
      return (
        <View
          style={[
            styles.container,
            { borderColor, backgroundColor: successColor }
          ]}
        >
          <Text style={[{ color, textAlign: "center" }]}>
            {success} {total && `(${total})`}
          </Text>
        </View>
      );
    }
  }
  const { stopped = title } = statusText;
  return (
    <TouchableOpacity
      style={[styles.container, { borderColor, backgroundColor: buttonColor }]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color }]}>
        {stopped} {total && `(${total})`}
      </Text>
    </TouchableOpacity>
  );
};

export default DownloadButton;

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    margin: 4,
    minHeight: 32
  },
  text: {
    textAlign: "center"
  },
  progress: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8
  },
  progressText: {
    marginRight: 24,
    textAlign: "center"
  },
  cancel: {
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    right: 0,
    top: 0,
    width: 24
  }
});
