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

import React, { useState, useCallback, useEffect } from "react";
import { NavigationState } from "@react-navigation/native";
import {
  createBottomTabNavigator,
  BottomTabBarProps
} from "@react-navigation/bottom-tabs";
import { useDispatch, useSelector } from "react-redux";

import AppFooter from "./AppFooter";
import AppHeader from "./AppHeader";
import Loading from "../containers/Loading";
import ProgramTable from "../containers/ProgramTable";
import ProgramList from "../containers/ProgramList";
import ProgramRanking from "../containers/ProgramRanking";
import { RootState } from "../modules";
import { NavActions } from "../modules/nav";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const dispatch = useDispatch();

  const routeName = useSelector<RootState, string>(
    ({ nav }) => nav.tab || "table"
  );

  const [route, setRoute] = useState<NavigationState>();

  useEffect(() => {
    if (route) {
      dispatch(NavActions.saveTab(route.routeNames[route.index]));
    }
  }, [route]);

  const tabBar = useCallback(({ state }: BottomTabBarProps) => {
    setRoute(state);
    return <AppFooter route={state} />;
  }, []);

  return (
    <>
      <AppHeader route={route} />
      <Tab.Navigator initialRouteName={routeName} tabBar={tabBar}>
        <Tab.Screen name="table" component={ProgramTable} />
        <Tab.Screen name="list" component={ProgramList} />
        <Tab.Screen name="ranking" component={ProgramRanking} />
      </Tab.Navigator>
      <Loading />
    </>
  );
};
export default TabNavigator;
