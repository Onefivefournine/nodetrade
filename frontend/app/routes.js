import Settings from './components/settings';
import Transactions from './components/transactions';
import MarketsData from './components/marketsData';

const routes = [{
    path: '/settings',
    name: 'settings',
    component: Settings,
}, {
    path: '/markets-data',
    name: 'marketsData',
    component: MarketsData,
}, {
    path: '/transactions',
    name: 'transactions',
    component: Transactions,
}, {
    path: '*',
    redirect: '/settings',
    name: '404'
}];

import Vue from 'vue';
import VueRouter from 'vue-router';
Vue.use(VueRouter);

const router = new VueRouter({
    routes,
    mode: 'history',
    linkActiveClass: 'active'
});

export default router;