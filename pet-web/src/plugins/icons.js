// ============================================================
// 图标按需注册 —— 只注册项目实际引用的图标
// 生成方式：对 @element-plus/icons-vue 全部 293 个图标名做源码子串扫描
//（含模板标签、:icon 绑定、路由 meta.icon 动态名）。宁多勿漏，
// 未用到的图标不再打包。新页面用到新图标时，在此清单中补一行即可。
// ============================================================
import { ArrowDown, Avatar, Back, Bell, Bottom, Box, Calendar, Camera, ChatDotRound, ChatLineRound, Check, Checked, CircleCheck, CircleCheckFilled, CircleClose, Clock, Close, Coffee, CoffeeCup, Coin, Collection, Comment, Connection, Cpu, DataLine, Delete, Document, Download, Edit, Eleme, ElementPlus, Expand, Failed, Files, Filter, FirstAidKit, Food, Goods, Grid, Hide, Histogram, IceCream, InfoFilled, Key, List, Loading, Location, Lock, MagicStick, Menu, Message, MessageBox, Money, Monitor, More, Notification, Odometer, OfficeBuilding, Open, Phone, Picture, PieChart, Place, Plus, Pointer, Reading, Refresh, RefreshLeft, Remove, Right, Search, Select, Service, Setting, Ship, Shop, ShoppingCart, Sort, Star, StarFilled, Stopwatch, Ticket, Tickets, Timer, Top, Unlock, Upload, UploadFilled, User, UserFilled, Van, View, Wallet, Warning } from '@element-plus/icons-vue'

export default function setupIcons(app) {
  const icons = { ArrowDown, Avatar, Back, Bell, Bottom, Box, Calendar, Camera, ChatDotRound, ChatLineRound, Check, Checked, CircleCheck, CircleCheckFilled, CircleClose, Clock, Close, Coffee, CoffeeCup, Coin, Collection, Comment, Connection, Cpu, DataLine, Delete, Document, Download, Edit, Eleme, ElementPlus, Expand, Failed, Files, Filter, FirstAidKit, Food, Goods, Grid, Hide, Histogram, IceCream, InfoFilled, Key, List, Loading, Location, Lock, MagicStick, Menu, Message, MessageBox, Money, Monitor, More, Notification, Odometer, OfficeBuilding, Open, Phone, Picture, PieChart, Place, Plus, Pointer, Reading, Refresh, RefreshLeft, Remove, Right, Search, Select, Service, Setting, Ship, Shop, ShoppingCart, Sort, Star, StarFilled, Stopwatch, Ticket, Tickets, Timer, Top, Unlock, Upload, UploadFilled, User, UserFilled, Van, View, Wallet, Warning };
  for (const [name, comp] of Object.entries(icons)) app.component(name, comp);
}