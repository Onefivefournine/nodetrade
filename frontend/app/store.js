import Vue from 'vue';
import Vuex from 'vuex';
Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        marketsData: [],
        settings: [],
        transactionLog: [],
        sortedBy: 'price',
        sortDir: true
    },
    mutations: {
        'SET_MARKETS_DATA': function(state, payload) {
            state.marketsData = payload;
        },
        'SET_SETTINGS': function(state, payload) {
            state.settings = payload;
        },
        'SET_SORTEDBY': function(state, bool) {
            state.sortedBy = bool;
        },
        'SET_SORTDIR': function(state, bool) {
            state.sortDir = bool;
        },
        'ADD_TRANSACTION': function(state, payload) {
            state.transactionLog.push(payload)
        }
    }
});