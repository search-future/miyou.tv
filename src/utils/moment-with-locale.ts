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

import { Platform, NativeModules } from "react-native";
import "moment/locale/ja"
import m from "moment";

const moment = m;
switch (Platform.OS) {
  case "android":
    moment.locale(NativeModules.I18nManager.localeIdentifier);
    break;
  case "ios":
    moment.locale(NativeModules.SettingsManager.settings.AppleLocale);
    break;
  case "web":
    moment.locale(window.navigator.language);
    break;
  default:
    moment.locale("ja");
}

export default moment;
