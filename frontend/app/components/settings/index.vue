<template src="./index.html"></template>
<script>
export default {
  data() {
    return {
      sending: false,
      reqSave: false,
      settings: JSON.parse( JSON.stringify( this.$store.state.settings ) )
    }
  },
  watch: {
    'settings.bittrexApiKey': function( val ) {
      if ( !val.length ) this.settings.liveTrading = false;
    },
    'settings.bittrexApiSecret': function( val ) {
      if ( !val.length ) this.settings.liveTrading = false;
    },
  },
  created() {
    this.$root.$on( 'gotSettings', this.gotSettingsHandler )
  },
  beforeDestroy() {
    this.$root.$off( 'gotSettings', this.gotSettingsHandler )
  },
  methods: {
    gotSettingsHandler( sets ) {
      if ( this.sending ) {
        alert( 'Successfully saved new settings!' );
        this.$router.push( { name: 'marketsData' } )
      }
      this.sending = false;
    },
    setSettings() {
      this.sending = true;
      this.$ws.sendWrap( 'setSettings', this.settings )
    }
  }
}
</script>
