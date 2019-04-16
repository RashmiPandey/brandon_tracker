import { NetInfo, Alert } from "react-native";

const Network = async () => {
    await NetInfo.getConnectionInfo().then((connectionInfo) => {
        if (connectionInfo.type === 'none') {
            Alert.alert('Please enable the Network')
        }
    }).then(data => {
        if (!data) {
            return false
        }
        else {
            return true
        }
    }).catch(err => {
        return false
    })
};
export default Network;

// let validate;
// await NetInfo.getConnectionInfo().then((connectionInfo) => {
//     if (connectionInfo.type !== 'none') {
//         return RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({ interval: 10000, fastInterval: 5000 })
//     } else {
//         return false;
//     }
// }).then(data => {
//     if (!data) {
//         validate = false;
//     } else {
//         validate = true;
//     }
// }).catch(err => {
//     validate = false;
// });
// return validate;
