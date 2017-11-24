import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import Vue from 'vue';
import { mapState } from 'vuex';

import store from './store';
import router from './routes';

export const App = new Vue({
    router,
    store,
    computed: { ...mapState(['settings', 'marketsData'])
    },
    beforeCreate() {
        Vue.prototype.$ws = new WebSocket('ws://localhost:2222');
    },
    created() {
        let self = this;
        this.$ws.sendWrap = (type, data) => {
            type = 'CLIENT::' + type;
            if (self.settings.logLevel >= 2) console.log('Sending message with type %s', type, data);
            self.$ws.send(JSON.stringify({ type, data }))
        }
        this.$ws.onopen = () => {
            if (self.settings.logLevel >= 2) console.log('WebSocket connection opened');
            this.$ws.sendWrap('getMarketsData')
            // self.$emit('WebSocketConnected')
        };
        this.$ws.onclose = () => {
            if (self.settings.logLevel >= 2) console.log('WebSocket connection closed');
            self.$emit('WebSocketClosed');
            alert('WebSocket connection closed! Please refresh page when WebSocketServer will be available')
        };
        this.$ws.onmessage = (msg) => {
            let parsedMsg = JSON.parse(msg.data);
            if (self.settings.logLevel >= 2) console.log('Received message with type %s', parsedMsg.type, parsedMsg.data);
            switch (parsedMsg.type) {
                case 'SERVER::marketsData':
                    if (parsedMsg.data) {
                        let mdata = Object.keys(parsedMsg.data).map((currencyKey) => {
                            let dataElem = parsedMsg.data[currencyKey],
                                found = self.marketsData.find(el => el.currency === dataElem.currency);
                            if (found) {
                                dataElem.up = found.price < dataElem.price;
                                dataElem.diff = (dataElem.price - found.price) * 100 / found.price;
                                if (found.price === dataElem.price) {
                                    dataElem.up = 'equals'
                                    dataElem.diff = 0;
                                }
                            } else {
                                dataElem.up = 'equals';
                                dataElem.diff = 0;
                            }
                            return dataElem
                        });
                        self.$store.commit('SET_MARKETS_DATA', mdata);
                        self.$emit('gotMarketsData');
                    }
                    break;
                case 'SERVER::settings':
                    self.$store.commit('SET_SETTINGS', parsedMsg.data || { logLevel: 3 });
                    self.$emit('gotSettings');
                    break;
                case 'SERVER::error':
                    if (self.settings.logLevel >= 1) console.error(parsedMsg.data)
                    break;
                case 'SERVER::transaction':
                    self.$store.commit('ADD_TRANSACTION', parsedMsg.data);
                    break;
                default:
                    if (self.settings.logLevel >= 1) console.warn('Unknown WebSocket message', parsedMsg)
                    break;
            }
        };
    },
    beforeDestroy() {
        this.$ws.close();
    },
}).$mount('#app');