import React from 'react'
import { createDrawerNavigator, createStackNavigator } from 'react-navigation';
import Login from '../src/screen/Login';
import { Easing, Animated, AppRegistry } from 'react-native';
import Dashboard from '../src/screen/Dashboard';
import LocationHistory from '../src/screen/LocationHistory';

const DrawerNav = createStackNavigator({
    Login: {
        screen: Login,
        navigationOptions: () => ({
            drawerLockMode: 'locked-closed'
        })
    },
    Dashboard: {
        screen: Dashboard,
        navigationOptions: () => ({
            drawerLockMode: 'locked-closed'
        })
    },
    LocationHistory: {
        screen: LocationHistory,
        navigationOptions: () => ({
            drawerLockMode: 'locked-closed'
        })
    }
}, {
        initialRouteName: 'Login',
        headerMode: 'none',
        transitionConfig: () => ({
            transitionSpec: {
                duration: 250,
                easing: Easing.out(Easing.poly(4)),
                timing: Animated.timing,
            },
            screenInterpolator: sceneProps => {
                const { layout, position, scene } = sceneProps
                const { index } = scene

                const height = layout.initHeight
                const translateY = position.interpolate({
                    inputRange: [index - 1, index, index + 1],
                    outputRange: [height, 0, 0],
                })

                const opacity = position.interpolate({
                    inputRange: [index - 1, index - 0.99, index],
                    outputRange: [0, 1, 1],
                })

                return { opacity, transform: [{ translateY }] }
            },
        })
    });

export default DrawerNav;
