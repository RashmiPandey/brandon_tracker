
import React, { Component } from "react";
import { StyleSheet, View, ActivityIndicator, ScrollView, BackHandler } from "react-native";
import Moment from 'moment';
import firebase from 'react-native-firebase';

import { Container, Text, Card, Header, Left, Button, Right, Body, Title, Content } from "native-base";
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
const collection = firebase.firestore().collection('Location')
import { openDatabase } from 'react-native-sqlite-storage';
const db = openDatabase({ name: 'test.db' });

export default class LocationHistory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            locationHistory: [],
            userInfo: this.props.navigation.getParam("userInfo") || null,
            loader: true,
            lastData: [],
            data: null
        }
    }

    componentDidMount() {
        BackHandler.addEventListener('hardwareBackPress', this.goBack);
        const data = this.props.navigation.getParam("location")
        if (data) {
            this.setState({ data })
            this.getUserPastInformation(data.email)
        }
    }

    getUserPastInformation = async (email) => {
        db.transaction((txn) => {
            txn.executeSql(`SELECT * FROM locations WHERE email='${email}'`, [], (tx, res) => {
                this.setState({
                    locationHistory: res.rows.raw()
                })
            });
        });

        // await collection.where("email", "==", email).limit(10).get().then(async res => {
        //     let locationHistory = []
        //     this.setState({ lastData: res._docs[res._docs.length - 1]._data.syncedAt, loader: false })
        //     res.docs.forEach(element => {
        //         locationHistory.push(element.data())

        //     });
        //     const data = locationHistory.sort((a, b) => Moment(b.syncedAt).unix() - Moment(a.syncedAt).unix());
        //     if (res.docs.length > 0) {
        //         this.setState({
        //             locationHistory: data,
        //         })
        //     }
        // }).catch(err => {
        //     this.setState({ loader: false })
        //     console.log('err----->>>', err)
        // });
    }
    componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress', this.goBack);
    }

    goBack = () => {
        const { userInfo, data } = this.state
        const switch1Value = data.switch1Value
        this.props.navigation.navigate("Dashboard", { userInfo, data, switch1Value });
    }

    render() {
        const { locationHistory, loader } = this.state;
        return (
            <Container>
                <Header>
                    <Left>
                        <Button onPress={() => this.goBack()} transparent>
                            <MCIcon size={35} name="arrow-left-thick" color="white" />
                        </Button>
                    </Left>
                    <Body>
                        <Title style={{ fontSize: 20 }} >Location History</Title>
                    </Body>
                    <Right />
                </Header>
                {loader ?
                    <ActivityIndicator style={styles.loader} size="large" color="blue" />
                    :
                    <Content style={{ padding: 5 }}>
                        {locationHistory.length > 0 ? locationHistory.map((loc, index) => (
                            <Card style={{ padding: 10 }} key={'his' + index} >
                                <Text> {Moment(loc.syncedAt).format('ddd, DD MMM YYYY HH:mm:ss')} </Text>
                                <View style={{ flexDirection: "row", padding: 5 }}>
                                    <View style={{ width: "40%" }}>
                                        <Text>Start Location : </Text>
                                        <Text>End Location : </Text>
                                        <Text>Distance Traveled : </Text>
                                    </View>
                                    <View style={{ width: "60%" }}>
                                        <Text>Lat: {(loc.startLoc.latitude).toFixed(2)}  Lng: {(loc.startLoc.longitude).toFixed(2)}</Text>
                                        {loc.endLoc ? <Text>Lat: {(loc.endLoc.latitude).toFixed(2)}  Lng: {(loc.endLoc.longitude).toFixed(2)}</Text> :
                                            <Text> - </Text>}
                                        <Text> {loc.distance !== null ? loc.distance : "less than 500 m"}</Text>
                                    </View>
                                </View>
                            </Card>
                        )) : <Text>No Data Available</Text>}
                    </Content>
                }

            </Container>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "#F5FCFF"
    },
    loader: {
        marginTop: '50%',
    }
})