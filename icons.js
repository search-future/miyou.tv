import AntDesign from "react-native-vector-icons/Fonts/AntDesign.ttf";
import Entypo from "react-native-vector-icons/Fonts/Entypo.ttf";
import EvilIcons from "react-native-vector-icons/Fonts/EvilIcons.ttf";
import Feather from "react-native-vector-icons/Fonts/Feather.ttf";
import FontAwesome from "react-native-vector-icons/Fonts/FontAwesome.ttf";
import FontAwesome5_Brands from "react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf";
import FontAwesome5_Regular from "react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf";
import FontAwesome5_Solid from "react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf";
import Foundation from "react-native-vector-icons/Fonts/Foundation.ttf";
import Ionicons from "react-native-vector-icons/Fonts/Ionicons.ttf";
import MaterialCommunityIcons from "react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf";
import MaterialIcons from "react-native-vector-icons/Fonts/MaterialIcons.ttf";
import Octicons from "react-native-vector-icons/Fonts/Octicons.ttf";
import SimpleLineIcons from "react-native-vector-icons/Fonts/SimpleLineIcons.ttf";
import Zocial from "react-native-vector-icons/Fonts/Zocial.ttf";

const iconFonts = {
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  FontAwesome,
  FontAwesome5_Brands,
  FontAwesome5_Regular,
  FontAwesome5_Solid,
  Foundation,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
  SimpleLineIcons,
  Zocial
};
const iconFontStyles = [];

for (const name in iconFonts) {
  iconFontStyles.push(`@font-face {
    src: url(${iconFonts[name]});
    font-family: ${name};
  }`);
}

const style = document.createElement("style");
style.type = "text/css";
if (style.styleSheet) {
  style.styleSheet.cssText = iconFontStyles.join("\n");
} else {
  style.appendChild(document.createTextNode(iconFontStyles.join("\n")));
}
document.head.appendChild(style);
