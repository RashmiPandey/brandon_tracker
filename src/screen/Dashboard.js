
import React, { Component } from "react";
import {
    StyleSheet,
    ScrollView,
    Alert,
    View,
    AsyncStorage,
    ActivityIndicator,
    TouchableOpacity,
    BackHandler,
    NetInfo
} from "react-native";
import BackgroundJob from 'react-native-background-job';
import firebase from 'react-native-firebase';
import geolib from 'geolib';
import Moment from 'moment';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler';
import DeviceInfo from 'react-native-device-info';
import { Container, Switch, List, ListItem, Text, Left, Right, Body } from "native-base";
import { Row, Grid, Col } from "react-native-easy-grid";
import FAIcon from 'react-native-vector-icons/FontAwesome';
import ENIcon from 'react-native-vector-icons/Entypo';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Network from '../../network/network'
import { openDatabase } from 'react-native-sqlite-storage';

const collection = firebase.firestore().collection('Location');
let dummyData = []
const db = openDatabase({ name: 'test.db' });

export default class Dashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            latitude: '',
            longitude: '',
            switch1Value: props.navigation.getParam('switch1Value') || false,
            interval: null,
            initialPoint: 0,
            initialLocation: {},
            currentDocId: null,
            errorCheck: 0,
            lastRepData: null,
            startRepData: null,
            email: "",
            locationHistory: [],
            userInfo: null,
            loader1: true,
            loader2: true
        };
        this._isMounted = false;
    }

    async componentWillMount() {
        const tracker = await AsyncStorage.getItem('tracker')
        if (tracker) {
            this.setState({ switch1Value: true })
        }
        BackgroundJob.register({
            jobKey: "myJob",
            job: () => this.findCoordinates()
        })
        BackgroundJob.cancelAll();
    }

    componentDidMount() {
        this._isMounted = true;
        const { switch1Value } = this.state
        if (this._isMounted) {
            if (switch1Value) {
                this.findCoordinates()
                this.backgroundJob()
            }
            BackHandler.addEventListener('hardwareBackPress', this.handleBackButtonClick);
            const userInfo = this.props.navigation.getParam('userInfo');
            const deviceId = DeviceInfo.getDeviceId()
            const data = this.props.navigation.getParam('data')
            this.setState({
                userInfo,
                email: userInfo.email,
                deviceId: deviceId,
                name: userInfo.givenName + ' ' + userInfo.familyName,
                lastRepData: data && data.lastRepData || null,
                startRepData: data && data.startRepData || null,
            }, () => {
                this.getUserPastInformation(userInfo.email);
            })
        }
    }

    async componentWillUnmount() {
        this._isMounted = false;
        BackHandler.removeEventListener('hardwareBackPress', this.handleBackButtonClick);
    }

    handleBackButtonClick = () => {
        this.alertModal('Exit App', 'Do you want to exit?', BackHandler.exitApp)
        return true;
    }

    backgroundJob = () => {
        BackgroundJob.schedule({
            jobKey: "myJob",
            period: 10000,
            exact: true,
            allowExecutionInForeground: true,
        })
    }

    checkRequirements = async () => {
        if (Network()) {
            const gps = await RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
            return gps.endsWith("enabled")
        }
    }

    findCoordinates = async () => {
        try {
            if (this.state.switch1Value) {
                await navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        console.log('position------->>>>', position, this.state)
                        if (this.state.initialPoint === 0) {
                            this.saveToLocalDB(position.coords);
                        }
                        if (this.state.initialPoint > 0 && this.state.initialLocation.latitude) {
                            let distance = await geolib.getDistance(
                                { latitude: this.state.initialLocation.latitude.toString(), longitude: this.state.initialLocation.longitude.toString() },
                                { latitude: position.coords.latitude.toString(), longitude: position.coords.longitude.toString() }
                            )
                            if (distance > 500) {
                                this.updateEndLocationToLocalDB(position.coords, distance)
                            }
                        }
                        this.setState({
                            loader1: false,
                            initialPoint: this.state.initialPoint + 1,
                            time: Date.now(),
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            errorCheck: 0,
                            switch1Value: true
                        });
                    },
                    error => {
                        console.log(" error--->>> ", error)
                    },
                    { enableHiaghAccuracy: true }
                );
            } else {
                this.setState({
                    errorCheck: this.state.errorCheck + 1
                }, () => {
                    if (this.state.errorCheck === 3) {
                        this.toggleSwitch1();
                        Alert.alert('Stop Location Tracking....')
                    }
                })
            }

        } catch (err) {

        }
    };

    getUserPastInformation = async (email) => {
        db.transaction((txn) => {
            txn.executeSql(`SELECT * FROM locations WHERE email='${email}'`, [], (tx, res) => {
                this.setState({
                    locationHistory: res.rows.raw(),
                    loader2: false,
                    loader1: false,
                    currentDocId: res.rows.raw().length
                })
            });
        });

        // lastRepData: data[0].syncedAt,
        //             startRepData: data[data.length - 1].syncedAt
    }

    // saveUserLocation = (dataTosave) => {
    //     collection.add(dataTosave).then(res => {
    //         this.setState({
    //             currentDocId: res.id,
    //         })
    //         this.getUserPastInformation(this.state.email);
    //     }).catch(err => {
    //         console.log(" = =  =err=== = > ", err)
    //     })
    // }

    saveLocToFirebase = () => {
        NetInfo.isConnected.fetch().then(isConnected => {
            if (isConnected) {
                db.transaction((txn) => {
                    txn.executeSql(`SELECT * FROM locations WHERE email='${this.state.email}'`, [], (tx, res) => {
                        for (let i = 0; i < res.rows.length; ++i) {
                            if (!res.rows[i].synced) {
                                let dataTosave = {
                                    "name": res.rows[i].name,
                                    "startLoc": new firebase.firestore.GeoPoint(res.rows[i].start_lat, res.rows[i].start_lng),
                                    "syncedAt": res.rows[i].syncedAt,
                                    "endLoc": new firebase.firestore.GeoPoint(res.rows[i].end_lat, res.rows[i].end_lng),
                                    "email": res.rows[i].email,
                                    "distance": res.rows[i].distance,
                                    "deviceId": res.rows[i].deviceId
                                }
                                collection.add(dataTosave).then(res => {
                                    // this.getUserPastInformation(this.state.email);
                                }).catch(err => {
                                    console.log(" = =  =err=== = > ", err)
                                })
                                txn.executeSql('UPDATE Locations SET synced=? WHERE email=?', [true, this.state.email]);
                            }
                        }
                    });
                });
            }
        });
    }

    saveToLocalDB = async (position) => {
        let dataTosave = {
            "name": this.state.name,
            "start_lat": position.latitude,
            "start_lng": position.longitude,
            "syncedAt": new Date(),
            "end_lat": null,
            "end_lng": null,
            "email": this.state.email,
            "distance": null,
            "deviceId": this.state.deviceId,
            "synced": false
        }
        this.dbTransactionSaveAndCreateTable(position, dataTosave)
    }

    dbTransactionSaveAndCreateTable = (position, dataTosave) => {
        db.transaction((txn) => {
            // txn.executeSql('DROP TABLE IF EXISTS LOCATIONS', []);
            txn.executeSql(
                'CREATE TABLE IF NOT EXISTS Locations(location_id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(255), start_lat VARCHAR(255), start_lng VARCHAR(255), syncedAt VARCHAR(30), end_lat VARCHAR(30), end_lng VARCHAR(30), email VARCHAR(30), distance VARCHAR(30), deviceId VARCHAR(30), synced BOOLEAN)',
                []
            );
            txn.executeSql('INSERT INTO Locations(name, start_lat, start_lng, syncedAt, end_lat, end_lng, email, distance, deviceId, synced) VALUES (?,?,?,?,?,?,?,?,?,?)', [dataTosave.name, dataTosave.start_lat, dataTosave.start_lng, dataTosave.syncedAt, dataTosave.end_lat, dataTosave.end_lng, dataTosave.email, dataTosave.distance, dataTosave.deviceId, dataTosave.synced]);
            txn.executeSql('SELECT * FROM `locations`', [], (tx, res) => {
                this.setState({
                    locationHistory: res.rows.raw(),
                    initialLocation: position,
                    currentDocId: res.rows.raw().length
                })
            });
            this.saveLocToFirebase()
        });
    }

    updateEndLocationToLocalDB = async (position, distance) => {
        db.transaction((txn) => {
            try {
                txn.executeSql('UPDATE Locations SET end_lat=?, end_lng=?, distance=? WHERE location_id=?', [position.latitude, position.longitude, distance, this.state.currentDocId]);
                txn.executeSql('SELECT * FROM `locations`', [], (tx, res) => {
                    this.setState({
                        locationHistory: res.rows.raw(),
                        initialLocation: position,
                        currentDocId: null
                    })
                });
                this.saveToLocalDB(position);
            } catch (err) {
                console.log(err)
            }

        });
    }

    onTracking = async () => {
        let requirement = await this.checkRequirements();
        console.log('requirement------>>>>>', requirement)
        if (requirement) {
            console.log('requirement---if--->>>>>', requirement)
            await AsyncStorage.setItem('tracker', JSON.stringify(true));
            this.setState({ switch1Value: true, loader1: true, loader2: true }, async () => {
                this.findCoordinates()
                this.backgroundJob()
            })
        }
    }

    stopTracking = async () => {
        await AsyncStorage.removeItem('tracker');
        this.setState({
            switch1Value: false,
            initialPoint: 0
        })
        BackgroundJob.cancelAll();
    }

    alertModal = (header, content, callback) => {
        Alert.alert(header, content,
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log('Cancel Pressed'),
                    style: 'cancel',
                },
                { text: 'OK', onPress: () => callback() },
            ],
            { cancelable: false },
        );

    }

    toggleSwitch1 = async () => {
        const { switch1Value } = this.state
        if (switch1Value) {
            this.alertModal('Stop Tracking',
                'Are you sure you want to turn off tracking? This may impact your ability to get accurate reports.',
                this.stopTracking
            )
        } else {
            this.onTracking()
        }
    }

    showHistory = () => {
        const { userInfo, switch1Value, lastRepData, startRepData, email } = this.state
        const location = {
            email,
            switch1Value,
            lastRepData,
            startRepData,
        }
        this.props.navigation.navigate("LocationHistory", { location, userInfo })
    }

    onPressSignOut = async () => {
        try {
            BackgroundJob.cancelAll();
            await AsyncStorage.removeItem('userData');
            this.props.navigation.navigate("Login");
        } catch (error) {
        }
    }

    render() {
        const { lastRepData, startRepData, switch1Value, loader2, loader1 } = this.state;
        return (
            <Container>
                <Grid>
                    <Row style={styles.row1} size={3}>
                        <View style={styles.navBar} >
                            <View style={styles.leftContainer} >
                                <Text size={30}>My City Tax</Text>
                            </View>
                            <View style={styles.rightContainer}>
                                <TouchableOpacity onPress={() => this.alertModal('Logout', 'Are you sure to logout..?', this.onPressSignOut)}>
                                    <FAIcon color={"red"} size={30} name="sign-out" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ alignItems: "center", flexDirection: "row" }}>
                            <View style={{ alignItems: "center", width: "50%" }}>
                                <Text> Tracking </Text>
                                {switch1Value ?
                                    <FAIcon name="check-circle" size={80} color="green" /> :
                                    <FAIcon name="minus-circle" size={80} color="red" />}
                            </View>
                            <View style={{ alignItems: "center", width: "50%" }}>
                                <Text> Cloud </Text>
                                <FAIcon name="check-circle" size={80} color="green" />
                            </View>
                        </View>
                        <View style={{ justifyContent: 'center' }}>
                            {(loader1 || loader2) && <ActivityIndicator style={[styles.loader, { top: (switch1Value && loader1 && loader2) ? "60%" : (switch1Value && !loader2) ? "50%" : "80%" }]}
                                size="large" color="blue" />}
                            {switch1Value &&
                                <View>
                                    <Text style={styles.txtBold}>Current Location </Text>
                                    <View style={styles.textRow}>
                                        <Text style={styles.leftTxt}> Longitude </Text>
                                        {!loader1 && <Text style={styles.rightTxt}> {this.state.longitude} </Text>}
                                    </View>
                                    <View style={styles.textRow}>
                                        <Text style={styles.leftTxt}> Latitude </Text>
                                        {!loader1 && <Text style={styles.rightTxt}> {this.state.latitude} </Text>}
                                    </View>
                                </View>
                            }
                            <View style={switch1Value ? styles.textRow : styles.nonTracking}>
                                <Text style={styles.leftTxt}> Last replication </Text>
                                {!loader2 && < Text style={styles.rightTxt}> {lastRepData ? Moment(lastRepData).format('ddd, DD MMM YYYY HH:mm:ss') : "No Synced Data"} </Text>}
                            </View>
                            <View style={switch1Value ? styles.textRow : styles.row4}>
                                <Text style={styles.leftTxt}> Tracking since </Text>
                                {!loader2 && <Text style={styles.rightTxt}> {startRepData ? Moment(startRepData).format('ddd, DD MMM YYYY HH:mm:ss') : "No Synced Data"} </Text>}
                            </View>
                        </View>

                    </Row>
                    <Row size={2}>
                        <ScrollView>
                            <List style={{ flex: 2 }} >
                                <ListItem>
                                    <Left>
                                        <ENIcon size={25} name="location" color="#aa0000" />
                                        <Text style={{ marginLeft: 10 }}>Tracking</Text>
                                    </Left>
                                    <Right>
                                        <Switch
                                            onValueChange={this.toggleSwitch1}
                                            value={this.state.switch1Value}
                                        />
                                    </Right>
                                </ListItem>
                                <ListItem>
                                    <Left>
                                        <MCIcon size={25} name="file-document-outline" />
                                        <Text style={{ marginLeft: 10 }}>Reporting</Text>
                                    </Left>
                                    <Right>
                                        <FAIcon size={25} name="chevron-right" />
                                    </Right>
                                </ListItem>
                                <ListItem>
                                    <Left>
                                        <ENIcon size={25} name="info-with-circle" color={"blue"} />
                                        <Text style={{ marginLeft: 10 }}>Free Version</Text>
                                    </Left>
                                    <Right>
                                        <FAIcon size={25} name="chevron-right" />
                                    </Right>
                                </ListItem>
                                <ListItem>
                                    <TouchableOpacity disabled={loader2} onPress={() => this.showHistory()}>
                                        <Left>
                                            <FAIcon size={25} name="history" color={"black"} />
                                            <Text style={{ marginLeft: 10, color: loader2 ? 'grey' : 'black' }}>Recover History</Text>
                                        </Left>
                                    </TouchableOpacity>
                                </ListItem>
                            </List>
                        </ScrollView>
                    </Row>
                </Grid>
            </Container >
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5FCFF"
    },
    welcome: {
        fontSize: 20,
        textAlign: "center",
        margin: 10
    },
    instructions: {
        textAlign: "center",
        color: "#333333",
        marginBottom: 5
    },
    row1: {
        backgroundColor: '#f7f7f7',
        flexDirection: "column"
    },
    navBar: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    leftContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginLeft: "32%"
    },
    rightContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginRight: "10%"
    },
    txtBold: {
        marginTop: "10%",
        textAlign: "center",
        fontWeight: "300",
        fontSize: 20,
    },
    textRow: { marginTop: "2%", alignItems: "center", flexDirection: "row" },
    nonTracking: { marginTop: '28.6%', alignItems: "center", flexDirection: "row" },
    row4: { marginTop: "7.5%", alignItems: "center", flexDirection: "row" },
    leftTxt: { paddingLeft: "5%", width: "40%" },
    rightTxt: { width: "60%" },
    loader: { position: "absolute", left: "50%" }
});