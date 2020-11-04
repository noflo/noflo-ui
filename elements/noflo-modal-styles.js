const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="noflo-modal-styles">
  <template>
    <style>
      :host {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--noflo-ui-background-shadow);
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        overflow-x: auto;
      }

      .modal-container {
        background-color: var(--noflo-ui-background);
        color: var(--noflo-ui-text);
        display: block;
        position: absolute;
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        top: 36px;
        width: calc(72px * 9);
        left: calc(50% - 72px * 4.5);
        z-index: 5;
        padding: 36px;
        box-sizing: border-box;
        border-radius: 3px;
        box-shadow: var(--noflo-ui-background) 0px 0px 2px;
        border: 1px solid var(--noflo-ui-text-highlight);
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .modal-content {
        max-height: calc(100vh - 252px);
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        overflow-x: hidden;
        padding-bottom: 18px;
        box-sizing: border-box;
      }

      h1 {
        font-size: 17px;
        line-height: 36px;
        margin: 0px;
        padding: 0px;
        margin-bottom: 18px;
      }
      label {
        display: block;
        font-size: 13px;
        margin-top: 17px;
        color: var(--noflo-ui-text);
        line-height: 17px;
      }
      label > span {
        line-height: 17px;
      }
      input,
      select,
      textarea {
        display: block;
        font-size: 17px;
        background-color: hsl(190, 100%, 30%);
        background-image: none;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        color: #fff;
        border-radius: 3px;
        padding: 3px;
        border: none;
        margin: 0px;
        width: 100%;
        box-sizing: border-box;
      }
      input::placeholder {
        color: hsl(0, 0%, 80%);
      }
      select {
        background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE2LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjMwNnB4IiBoZWlnaHQ9IjMwNnB4IiB2aWV3Qm94PSIwIDAgMzA2IDMwNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzA2IDMwNjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGcgaWQ9ImV4cGFuZC1tb3JlIj4NCgkJPHBvbHlnb24gcG9pbnRzPSIyNzAuMyw1OC42NSAxNTMsMTc1Ljk1IDM1LjcsNTguNjUgMCw5NC4zNSAxNTMsMjQ3LjM1IDMwNiw5NC4zNSAJCSIvPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K);
        background-repeat: no-repeat;
        background-position: 98% 50%;
        background-size: 8px;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        padding-right: 1em;
      }
      div.CodeMirror {
        border: 1px solid var(--noflo-ui-text);
        border-radius: 3px;
      }

      .toolbar {
        display: block;
        line-height: 36px;
        margin-top: 18px;
      }
      .toolbar button {
        background-color: transparent;
        color: hsl(190, 100%, 30%);
        border: 1px solid hsl(190, 100%, 30%);
        font-size: 13px;
        border-radius: 3px;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        height: 36px;
        padding-left: 36px;
        padding-right: 36px;
        margin: 0px;
        cursor: pointer;
      }
      .toolbar button.disabled {
        opacity: 0.1;
      }
      .toolbar a {
        font-size: 13px;
        color: hsl(190, 100%, 30%);
        text-decoration: none;
        height: 36px;
        padding-left: 36px;
        padding-right: 36px;
        cursor: pointer;
      }

      html polymer-element{
        display: none;
      }
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
