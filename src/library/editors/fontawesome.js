// @ts-nocheck

import icons from "../../../vendor/fontawesome-icons-7.3.0.js";
import Jedison from "../../../vendor/jedison-1.13.0.js";

// Define the custom widget
export class FontAwesomeEditor extends Jedison.EditorString {
  static resolves(schema) {
    const schemaType = Jedison.Schema.getSchemaType(schema);
    const format = Jedison.Schema.getSchemaFormat(schema);
    return schemaType === "string" && format === "fontawesome";
  }

  build() {
    super.build();
    console.log(this.instance);

    this.control = this.theme.getInputControl({
      title: this.getTitle(),
      description: this.getDescription(),
      type: "text",
      id: this.getIdFromPath(this.instance.path),
      titleIconClass: Jedison.Schema.getSchemaXOption(
        this.instance.schema,
        "titleIconClass",
      ),
      titleHidden: Jedison.Schema.getSchemaXOption(
        this.instance.schema,
        "titleHidden",
      ),
      info: this.getInfo(),
    });
    this.input = this.control.input;
    console.log(this.input, this.control);

    // 2. Adjust the default text input styling
    this.input.style.display = "inline-block";
    this.input.style.width = "30%";

    // 3. Create the custom visual preview element
    this.iconPreview = document.createElement("i");
    this.iconPreview.style.fontSize = "24px";
    this.iconPreview.style.marginLeft = "10px";
    this.iconPreview.className = "fa-icon";
    this.iconPreview.style.verticalAlign = "middle";

    // 4. Append it to the container that Jedison built
    this.control.container.appendChild(this.iconPreview);

    // 5. Listen for input changes to update our custom UI
    this.input.addEventListener("input", () => {
      console.log(this.input);
      this.updateIconPreview();
    });
    this.updateIconPreview();
  }

  // setValue is triggered when data is programmatically passed in (e.g., from Yjs)
  setValue(value, initial, from_template) {
    super.setValue(value, initial, from_template);
    this.updateIconPreview();
  }

  // Helper method to sync the visual state
  updateIconPreview() {
    this.iconPreview.innerHTML = icons()[this.instance.value];
  }
}
