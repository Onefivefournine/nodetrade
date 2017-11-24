<template src="./index.html"></template>
<script>
import moment from 'moment';
import { mapState } from 'vuex';
export default {
  data() {
    return {
      lastRefresh: moment().format( 'DD.MM.YYYY HH:mm:ss' ),
      loading: this.marketsData && !this.marketsData.length,
    }
  },
  created() {
    this.$root.$on( 'gotMarketsData', this.gotMarketsDataHandler );
  },
  beforeDestroy() {
    this.$root.$off( 'gotMarketsData', this.gotMarketsDataHandler )
  },
  computed: {
    ...mapState( [ 'settings', 'marketsData' ] ),
    sortedBy:{
      get(){return this.$store.state.sortedBy},
      set(val){this.$store.commit('SET_SORTEDBY',val)}
    },
    dir:{
      get(){return this.$store.state.sortDir},
      set(val){this.$store.commit('SET_SORTDIR',val)}
    },
    summaryPrice() {
      return this.marketsData.reduce( ( sum, el ) => {
        if ( el.hasBuy ) return sum + el.price
        return sum
      }, 0 ).toFixed(8)
    },
    totalAvgProfit() {
      return (this.marketsData.reduce( ( sum, el ) => {
              if ( typeof el.profit !== 'number' || isNaN( el.profit ) ) return sum;
              return sum + el.profit;
            }, 0 ) / this.marketsData.filter(el=>el.profit).length).toFixed(8)
    }
  },
  methods: {
    gotMarketsDataHandler( mdata ) {
      if ( this.loading ) this.loading = false;
      if(this.sortedBy) this.sortBy(this.sortedBy,true)
      this.lastRefresh = moment().format( 'DD.MM.YYYY HH:mm:ss' );
    },
    triangle(order){
      if(this.sortedBy === order) return this.dir?'▴':'▾';
      return ''
    },
    minRise( md ) {
      if ( !this.settings || !this.settings.minRiseToBePositive ) return 0;
      return ( this.settings.minRiseToBePositive * md.price / 100 ).toFixed( 8 )
    },
    minFall( md ) {
      if ( !this.settings || !this.settings.minFallToBeNegative ) return 0;
      return ( this.settings.minFallToBeNegative * md.price / 100 ).toFixed( 8 )
    },
    sortBy(order,fromRefresh){
      if(this.sortedBy === order && !fromRefresh) this.dir = !this.dir;
      let sortedArray;

      const sortFn = (a,b)=>((order === 'date')? Date.parse(a.timestamp)-Date.parse(b.timestamp): a[order]-b[order]);
      if(order === 'rises_falls'){
        sortedArray = this.marketsData.sort((a,b)=>(this.dir?b.risesInRow-a.risesInRow:b.fallsInRow-a.fallsInRow))
      } else {
        sortedArray = this.dir? this.marketsData.sort(sortFn).reverse(): this.marketsData.sort(sortFn);
      }

      this.$store.commit('SET_MARKETS_DATA',sortedArray)
      this.sortedBy = order;
    }
  },
  filters: {
    parseDate( val ) {
      return moment( val ).format( 'DD.MM.YYYY HH:mm:ss' )
    },
    fixDiff( diff, item ) {
      if ( !diff || diff === '0' || diff === '-' ) return diff;
      return ( diff > 0 ? '+' : '' ) + ( +diff ).toFixed( 8 ) + '%';
    }
  }
}
</script>
<style>
  table.marketsData th{
    cursor:pointer;
  }

</style>