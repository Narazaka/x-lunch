const state = {};

const handler = {};

const enterPress = (callback) => (event) => { if (event.keyCode == 13) callback() };

const fa = (faClass, optionalClasses = {}) => Object.assign({ fa: true, [`fa-${faClass}`]: true }, optionalClasses);
