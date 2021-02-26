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
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { IpcRendererEvent } from "electron";
import { Progress } from "electron-dl";

type DownloadStatus = "stopped" | "started" | "wait" | "success" | "failure";

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
  source,
  statusText = {},
  color = "#000000",
  backgroundColor = "#808080",
  buttonColor = "#00ff00",
  borderColor = "#808080",
  progressColor = "#00800080",
  successColor = "#008000",
  failureColor = "#ff0000",
  onSuccess,
  onFailure
}: Props) => {
  const statusRef = useRef<DownloadStatus>("stopped");

  const [status, setStatus] = useState<DownloadStatus>("stopped");
  const [progress, setProgress] = useState<Progress>();

  const total = useMemo(() => {
    const bytes = progress?.totalBytes || source.size;
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
  }, [progress?.totalBytes, source.size]);
  const current = useMemo(() => {
    if (progress?.transferredBytes) {
      if (progress?.transferredBytes > 2 ** 30) {
        return `${(progress?.transferredBytes / 2 ** 30).toFixed(1)}GB`;
      }
      if (progress?.transferredBytes > 2 ** 20) {
        return `${(progress?.transferredBytes / 2 ** 20).toFixed(1)}MB`;
      }
      return `${(progress?.transferredBytes / 2 ** 10).toFixed(1)}KB`;
    }
    return `0KB`;
  }, [progress?.transferredBytes]);
  const percent = useMemo(() => (progress?.percent || 0) * 100, [progress]);

  useEffect(() => {
    const onDownloadStarted = () => {
      if (statusRef.current === "stopped") {
        statusRef.current = "wait";
        setStatus(statusRef.current);
      }
    };
    const onDownloadCancel = () => {
      if (statusRef.current === "wait" || statusRef.current === "started") {
        statusRef.current = "stopped";
        setStatus(statusRef.current);
      }
    };
    const onDownloadProgress = (
      event: IpcRendererEvent,
      progress: Progress
    ) => {
      if (statusRef.current === "started") {
        setProgress(progress);
      } else if (statusRef.current === "stopped") {
        statusRef.current = "wait";
        setStatus(statusRef.current);
      }
    };
    const onDownloadSuccess = () => {
      if (statusRef.current === "wait") {
        statusRef.current = "stopped";
        setStatus(statusRef.current);
      } else if (statusRef.current === "started") {
        if (onSuccess) {
          onSuccess();
        }
        statusRef.current = "success";
        setStatus(statusRef.current);
      }
    };
    const onDownloadFailute = (event: IpcRendererEvent, e: any) => {
      if (statusRef.current === "wait") {
        statusRef.current = "stopped";
        setStatus(statusRef.current);
      } else if (statusRef.current === "started") {
        if (onFailure) {
          onFailure(e);
        }
        statusRef.current = "failure";
        setStatus(statusRef.current);
      }
    };
    window.download.on("started", onDownloadStarted);
    window.download.on("cancel", onDownloadCancel);
    window.download.on("progress", onDownloadProgress);
    window.download.on("success", onDownloadSuccess);
    window.download.on("failure", onDownloadFailute);
    return () => {
      window.download.off("started", onDownloadStarted);
      window.download.off("cancel", onDownloadCancel);
      window.download.off("progress", onDownloadProgress);
      window.download.off("success", onDownloadSuccess);
      window.download.off("failure", onDownloadFailute);
    };
  }, []);

  const onPress = useCallback(() => {
    const { uri, filename } = source;
    statusRef.current = "started";
    setStatus(statusRef.current);
    window.download.request(uri, filename);
  }, [source]);
  const onCancelPress = useCallback(() => {
    window.download.abort();
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
          <Text style={[styles.progressText, { color }]}>
            {percent.toFixed(1)}%({current}
            {total && `/${total}`})
          </Text>
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
    case "wait": {
      const { wait = title } = statusText;
      return (
        <View
          style={[
            styles.container,
            { borderColor, backgroundColor: backgroundColor }
          ]}
        >
          <Text style={[styles.text, { color }]}>{wait}</Text>
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
    case "failure": {
      const { failure = `${title} ダウンロード失敗` } = statusText;
      return (
        <TouchableOpacity
          style={[
            styles.container,
            { borderColor, backgroundColor: failureColor }
          ]}
          onPress={onPress}
        >
          <Text style={[styles.text, { color }]}>
            {failure} {total && `(${total})`}
          </Text>
        </TouchableOpacity>
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
