const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="noflo-card-styles">
  <template>
    <style>
    :host {
      display: block;
      width: 216px;
      height: 105px;
      overflow: hidden;
      display: inline-block;
      text-align: center;
      background-color: var(--noflo-ui-background);
      color: var(--noflo-ui-text);
      border-radius: 3px;
      margin-right: 18px;
      margin-left: 18px;
      margin-bottom: 36px;
      position: relative;
      cursor: pointer;
    }
    h2 {
      position: absolute;
      top: 36px;
      line-height: 36px;
      width: 150px;
      text-transform: none;
      font-size: 12px;
      text-align: left;
      white-space: nowrap;
      left: 18px;
      padding: 0px;
      margin: 0px;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    p {
      position: absolute;
      top: 53px;
      left: 18px;
      width: 150px;
      text-transform: uppercase;
      font-size: 10px;
      text-align: left;
      max-height: 36px;
      overflow: hidden;
      color: hsl(189, 11%, 50%);
    }
    p span {
      text-overflow: ellipsis;
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
    }
    #menubutton {
      position: absolute;
      right: 36px;
      top: 18px;
      background-color: transparent;
      color: var(--noflo-ui-text);
      border: 0px;
      outline: 0px;
      cursor: pointer;
    }
    #menu {
      position: absolute;
      right: 36px;
      top: 36px;
      padding: 0px;
      margin: 0px;
      background-color: var(--noflo-ui-text);
      color: var(--noflo-ui-background);
      box-shadow: 3px 3px var(--noflo-ui-background);
      z-index: 1;
    }
    #menu li {
      list-style: none;
      text-align: left;
      margin-bottom: 2px;
      margin-top: 2px;
    }
    #menu li button {
      background-color: transparent;
      border: 0px;
      outline: 0px;
      color: var(--noflo-ui-background);
      cursor: pointer;
      font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
      text-align: left;
    }
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
