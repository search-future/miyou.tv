import "react-native-elements";
import { Theme as Navigation } from "@react-navigation/native";

declare module "react-native-elements" {
  export interface Colors {
    default: string;
    background: string;
    border: string;
    selected: string;
    appBg: string;
    appBorder: string;
    titlebar: string;
    titlebarBorder: string;
    titlebarBg: string;
    control: string;
    controlBg: string;
    controlBgActive: string;
    controlBorder: string;
    controlFg: string;
  }

  export interface FullTheme {
    Navigation: Navigation;
  }
}
