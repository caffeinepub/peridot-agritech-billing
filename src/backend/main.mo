import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type Product = {
    name : Text;
    price : Nat; // Price in rupees
  };

  module Product {
    public func compare(p1 : Product, p2 : Product) : Order.Order {
      Text.compare(p1.name, p2.name);
    };
  };

  type Customer = {
    name : Text;
    mobile : Text;
  };

  module Customer {
    public func compare(c1 : Customer, c2 : Customer) : Order.Order {
      Text.compare(c1.name, c2.name);
    };
  };

  type InvoiceItem = {
    itemName : Text;
    price : Nat;
    qty : Nat;
    itemTotal : Nat;
  };

  type Invoice = {
    customerName : Text;
    items : [InvoiceItem];
    grandTotal : Nat;
    invoiceNo : Text;
    createdAt : Int; // Timestamp
  };

  type Stats = {
    totalInvoices : Nat;
    totalRevenue : Nat;
  };

  let products = Map.empty<Text, Product>();
  let customers = Map.empty<Text, Customer>();
  let invoices = Map.empty<Text, Invoice>();

  // Authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserRole = AccessControl.UserRole;

  // User Profile Management
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Product CRUD operations
  public shared ({ caller }) func createProduct(name : Text, price : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let product : Product = {
      name;
      price;
    };
    products.add(name, product);
  };

  public shared ({ caller }) func updateProduct(name : Text, price : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (not products.containsKey(name)) {
      Runtime.trap("Product not found");
    };
    let product : Product = {
      name;
      price;
    };
    products.add(name, product);
  };

  public query ({ caller }) func getProduct(name : Text) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access products");
    };
    switch (products.get(name)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };
  };

  public query ({ caller }) func listProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access products");
    };
    products.values().toArray().sort();
  };

  public shared ({ caller }) func deleteProduct(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (not products.containsKey(name)) {
      Runtime.trap("Product not found");
    };
    products.remove(name);
  };

  // Customer CRUD operations
  public shared ({ caller }) func createCustomer(name : Text, mobile : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let customer : Customer = {
      name;
      mobile;
    };
    customers.add(name, customer);
  };

  public shared ({ caller }) func updateCustomer(name : Text, mobile : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (not customers.containsKey(name)) {
      Runtime.trap("Customer not found");
    };
    let customer : Customer = {
      name;
      mobile;
    };
    customers.add(name, customer);
  };

  public query ({ caller }) func getCustomer(name : Text) : async Customer {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access customers");
    };
    switch (customers.get(name)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) { customer };
    };
  };

  public query ({ caller }) func listCustomers() : async [Customer] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access customers");
    };
    customers.values().toArray().sort();
  };

  public shared ({ caller }) func deleteCustomer(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (not customers.containsKey(name)) {
      Runtime.trap("Customer not found");
    };
    customers.remove(name);
  };

  // Invoice operations
  public shared ({ caller }) func createInvoice(customerName : Text, items : [InvoiceItem], grandTotal : Nat, invoiceNo : Text, createdAt : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create invoices");
    };
    let invoice : Invoice = {
      customerName;
      items;
      grandTotal;
      invoiceNo;
      createdAt;
    };
    invoices.add(invoiceNo, invoice);
  };

  public query ({ caller }) func listInvoices() : async [Invoice] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access invoices");
    };
    invoices.values().toArray();
  };

  // Stats query
  public query ({ caller }) func getStats() : async Stats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access stats");
    };
    var totalRevenue : Nat = 0;
    for (invoice in invoices.values()) {
      totalRevenue += invoice.grandTotal;
    };
    {
      totalInvoices = invoices.size();
      totalRevenue;
    };
  };

  // Seed default products on first deploy
  system func preupgrade() {
    if (products.isEmpty()) {
      products.add("White Radish (60g)", { name = "White Radish (60g)"; price = 59 });
      products.add("Green Mustard (60g)", { name = "Green Mustard (60g)"; price = 59 });
      products.add("Pea Shoots (60g)", { name = "Pea Shoots (60g)"; price = 59 });
      products.add("Baby Palak", { name = "Baby Palak"; price = 60 });
      products.add("Button Mushroom", { name = "Button Mushroom"; price = 65 });
    };
  };
};
