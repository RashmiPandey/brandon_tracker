import React, { Component } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, AsyncStorage, StatusBar, Text } from 'react-native';
import { Spinner } from 'native-base';
import { GoogleSignin } from 'react-native-google-signin';
import firebase from 'react-native-firebase';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Network from '../../network/network';

const firebaseConfig = {
    apiKey: 'AIzaSyDg08Mo867i9IdhH8Qg8USI2dGTP_Yi7pA',
    authDomain: 'locationtracker-e6a4b.firebaseapp.com',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: ''
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

class Login extends Component {

    state = {
        spin: false,
    }

     componentWillMount() {
        // this.props.navigation.navigate("Dashboard")
        this._retrieveUserData();
        GoogleSignin.configure({
            iosClientId: '633269126435-0kpcl2bolvf983hqj68u8t785s4ic4n5.apps.googleusercontent.com',
            webClientId: '633269126435-t2oplski7b9ghv9lp8p5a49umdjrb6ll.apps.googleusercontent.com',
            offlineAccess: true,
            scopes: ['profile']
        })
    }

    _retrieveUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData !== null) {
                this.props.navigation.navigate("Dashboard", {
                    userInfo: JSON.parse(userData)
                });
            }
        } catch (error) {
        }
    }

    saveUserInfo = async (user) => {
        await AsyncStorage.setItem('userData', JSON.stringify(user)).then(() => {
            this.props.navigation.navigate("Dashboard", {
                userInfo: user
            })
        })
    }

    _handleGoogleLogin = async () => {
        try {
            this.setState({ spin: true })
            await GoogleSignin.hasPlayServices({ autoResolve: true });
            GoogleSignin.signOut().then(async () => {
                GoogleSignin.signIn().then((data) => {
                    let user = {
                        givenName: data.givenName,
                        accessTokenExpirationDate: data.accessTokenExpirationDate,
                        serverAuthCode: data.serverAuthCode,
                        id: data.id,
                        familyName: data.familyName,
                        name: data.name,
                        email: data.email,
                        photo: data.photo
                    }
                    this.setState({ spin: false })
                    this.saveUserInfo(user)
                }).catch(err => {
                    console.log("=====>>>>", err)
                    // this.props.navigation.navigate("Dashboard")
                })
            })
        } catch (error) {
            console.log(" - - - -error p p p >  ", error)
        }
    };

    render() {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                {this.state.spin ?
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d569b' }}>
                        <Spinner color='white' />
                    </View> :
                    <View style={styles.rootcontainer}>
                        <View style={styles.imagecontainer}>
                            <Image style={styles.imagestyle1} source={require('../assets/images/mycitytax.jpg')} />
                        </View>
                        <View style={styles.buttoncontainer}>
                            <TouchableOpacity onPress={() => this._handleGoogleLogin()}>
                                <View style={styles.imagestyle}>
                                    <MCIcon style={{ color: "white"}} size={30} name="google-plus"></MCIcon>
                                    <View style={{justifyContent: 'center', marginLeft: 10, marginRight: 10, alignItems: "center"}} >
                                        <Text style={{textAlign: 'center', fontSize: 20, fontWeight: "bold", color: "white"}}> Click To Login</Text>
                                    </View>
                                    <MCIcon style={{ color: "white"}}  size={30} name="login-variant"></MCIcon>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>}
            </View>
        );
    }
}

export default Login;

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    rootcontainer: {
        flex: 1,
    },
    imagecontainer: {
        height: '70%',
        backgroundColor: '#fff',
        justifyContent: "center"
    },
    buttoncontainer: {
        backgroundColor: '#fff',
        alignItems: 'center',
        height: "30%"
    },
    imagestyle1: {
        width: "100%",
        resizeMode: "contain"
    },
    imagestyle: {
        backgroundColor: 'green',
        flexDirection: "row",
        padding: 5,
        borderRadius: 15
    }
});
