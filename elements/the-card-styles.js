const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="the-card-styles">
  <template>
    <style>
      :host {
        display: block;
        margin: 0px;
        padding: 10px 10px 10px;
        -webkit-box-sizing: border-box;
        -moz-box-sizing: border-box;
        box-sizing: border-box;
        border-bottom: 1px var(--noflo-ui-border) solid;
        border-right: 1px var(--noflo-ui-border) solid;
        background-color: var(--noflo-ui-background) !important;
        color: var(--noflo-ui-text);
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        position: relative;
      }
      button {
        width: 36px;
        height: 36px;
        font-size: 10px;
        background-color: transparent;
        border: none;
        color: var(--noflo-ui-text);
        text-align: center;
        cursor: pointer;
      }
      h1 {
        font-size: 12px;
        line-height: 36px;
        margin: 0px;
        margin-bottom: 0px;
        text-shadow: 0 1px var(--noflo-ui-background);
        text-align: left;
      }
      header {
        height: 36px;
      }
      header h1 {
        display: block;
        position: absolute;
        top: 10px;
        left: 10px;
        width: calc(72px * 3 - 1px);
        height: 36px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      header h1.clear {
        cursor: pointer;
      }
      header h2 {
        line-height: 36px;
        width: 72px;
        height: 36px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        position: absolute;
        top: 10px;
        right: 10px;
        margin: 0px;
        text-align: right;
        font-size: 10px;
        color: var(--noflo-ui-border-highlight);
        display: block;
        cursor: default;
      }
      ul {
        margin: 0px;
        padding: 0px;
        list-style: none;
      }
      ul li {
        display: block;
        padding: 0px;
        margin: 0px;
      }
      ul.toolbar2right {
        width: 180px;
        display: block;
        position: absolute;
        right: 36px;
        top: 10px;
        text-align: right;
      }
      ul.toolbar li {
        float: left;
        display: block;
        width: calc(100%/2);
        height: 36px;
        text-align: center;
        margin: 0px;
        margin-right: 0px;
      }
      ul.toolbar2right li {
        float: right;
        width: auto;
      }
      ul.toolbar li * {
        line-height: 36px;
      }
      li button {
        width:100%;
        height:100%;
      }
      textarea {
        width: 100%;
        min-height: 100px;
        max-height: calc(72px * 4);
      }
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
