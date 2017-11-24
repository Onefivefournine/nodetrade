<template>
  <div class="container-fluid my-4">
    <h2>Transactions</h2>
    <br>
    <h4 v-show="!transactionLog.length">Buy/sell transactions will be shown here when they appear</h4>
    <table class="table table-hover" v-show="transactionLog.length">
        <thead>
            <tr>
                <th>Type</th>
                <th>Price</th>
                <th>Profit</th>
                <th>Coin</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="tr in transactionLog">
                <td>{{tr.type}}</td>
                <td>{{tr.price}}</td>
                <td>{{tr.profit}}</td>
                <td>{{tr.currency}}</td>
                <td>{{tr.createdAt | parseDate}}</td>
            </tr>
        </tbody>
    </table>
  </div>
</template>
<script>
import {mapState} from 'vuex'
export default {
    computed:{
        ...mapState(['transactionLog'])
    },
    filters: {
    parseDate( val ) {
      return moment( val ).format( 'DD.MM.YYYY HH:mm:ss' )
    },
}
}
</script>
