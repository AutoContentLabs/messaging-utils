// getInstanceInfo.js
const os = require('os');

function getInstanceInfo() {
    const hostInfo = {
        name: os.hostname()
    };

    const networkInfo = [];
    const NETWORK_INTERFACE = os.networkInterfaces();

    for (let interfaceName in NETWORK_INTERFACE) {
        NETWORK_INTERFACE[interfaceName].forEach(details => {
            networkInfo.push({
                interface: interfaceName,
                ipAddress: details.address,
                macAddress: details.mac,
                family: details.family
            });
        });
    }

    return {
        hostInfo,
        networkInfo
    };
}

function getIpAddress(type = 'IPv4') {
    const { networkInfo } = getInstanceInfo();

    const ipInfo = networkInfo.filter(info => info.family === type);
    return ipInfo.length > 0 ? ipInfo.map(info => info.ipAddress) : null;
}

function getMacAddress(ipAddress) {
    const { networkInfo } = getInstanceInfo();

    const macInfo = networkInfo.find(info => info.ipAddress === ipAddress);
    return macInfo ? macInfo.macAddress : null;
}

module.exports = {
    getInstanceInfo,
    getIpAddress,
    getMacAddress
};
