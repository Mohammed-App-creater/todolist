const express = require("express");
const bdyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/views/date.js");

const app = express();

app.set("view engine", "ejs");
app.use(bdyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB");

let deleting = false;
const itemsSchema = {
  name: String,
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!",
});

const item2 = new Item({
  name: "Hit the + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: {
    type: [itemsSchema],
    default: defaultItems,
  },
};

const List = mongoose.model("List", listSchema);

async function getItems() {
  try {
    const items = await Item.find({});
    return items;
  } catch (err) {
    console.error(err);
  }
}

app.get("/", async (req, res) => {
  try {
    const itemNames = await getItems();

    if (itemNames.length === 0) {
      if (!deleting) {
        await Item.insertMany(defaultItems);
        console.log("Successfully saved default items to DB");
        res.redirect("/");
      } else {
        res.render("list", { listTitle: "Today", newListItem: itemNames });
        deleting = false;
      }
    } else {
      res.render("list", { listTitle: "Today", newListItem: itemNames });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  const foundList = await List.findOne({ name: customListName });

  if (!foundList) {
    const list = new List({
      name: customListName,
      items: defaultItems,
    });
    await list.save();
    res.redirect("/" + customListName);
  } else {
    res.render("list", {
      listTitle: foundList.name,
      newListItem: foundList.items,
    });
  }
});

app.post("/", async (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.button;

  const item = new Item({
    name: itemName,
  });

  if (listName == "Today") {
    await item.save();
    res.redirect("/");
  } else {
    const list = await List.findOne({ name: listName });
    list.items.push(item);
    await list.save();
    res.redirect("/" + listName);
  }
});

app.post("/delete", async (req, res) => {
  console.log(req.body);
  const listName = req.body.Name;
  const checkedItemId = req.body.checkbox;
  try {
    deleting = true;
    if (listName === "Today") {
      await Item.findOneAndDelete(checkedItemId);
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    } else {
      await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } }
      );
      console.log("Successfully deleted checked item from " + listName);

      res.redirect("/" + listName);
    }
  } catch (err) {
    console.log(err);
  }
});

app.listen(8000, () => {
  console.log("Server is lisning on Port 8000");
});
