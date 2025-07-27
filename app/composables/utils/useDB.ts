// import type { ChatMessageVO } from "../api/chat/message";

// const dbName = "jiwuchat_db";
// const tableNameList = [
//   "message",
// ];

// export interface TableNameListItemType {
//   message: ChatMessageVO
// }

// export interface DBPromise<T> extends Promise<T> {
//   resolve: (value: T | PromiseLike<T>) => void
//   reject: (reason?: any) => void
// }

// function resolvablePromise<T>() {
//   let resolve: (value: T | PromiseLike<T>) => void;
//   let reject: (reason?: any) => void;
//   const promise = new Promise((_resolve, _reject) => {
//     resolve = _resolve;
//     reject = _reject;
//   }) as DBPromise<T>;
//   // @ts-expect-error
//   promise.resolve = resolve;
//   // @ts-expect-error
//   promise.reject = reject;
//   return promise;
// }

// // 1.新建或者打开数据库
// const request = window.indexedDB.open(dbName);
// const dbPromise = resolvablePromise<IDBDatabase>();
// request.onupgradeneeded = () => {
//   const db = request.result;
//   // 2.创建对象仓库，即新建表
//   tableNameList.forEach((tableName) => {
//     if (!db.objectStoreNames.contains(tableName)) {
//       const table = db.createObjectStore(tableName, { keyPath: "id" });
//       // 索引
//       table.createIndex("id", "id", { unique: true });
//     }
//   });
//   dbPromise.resolve(db);
// };
// request.onsuccess = (event) => {
//   const db = request.result;
//   console.log("onsuccess...", db);
//   dbPromise.resolve(db);
// };
// export function useDBInit() {
// }
// async function getStore(tableName: keyof TableNameListItemType, operationMode: IDBTransactionMode = "readonly") {
//   const db = await dbPromise;
//   const store = db.transaction(tableName, operationMode).objectStore(tableName);
//   return store;
// }
// function promisify(request: IDBRequest<IDBValidKey>) {
//   return new Promise((resolve, reject) => {
//     request.onsuccess = () => resolve(request.result);
//     request.onerror = () => reject(request.error);
//   });
// }
// // 3.添加数据
// async function setItem<T extends object>(tableName: keyof TableNameListItemType, key: IDBValidKey, value: T | any) {
//   const store = await getStore(tableName, "readwrite");
//   const request = store.put(value, key);
//   return promisify(request);
// }
// // 4.读取数据
// async function getItem(tableName: keyof TableNameListItemType, key: IDBValidKey) {
//   const store = await getStore(tableName, "readonly");
//   const request = store.get(key);
//   return promisify(request);
// }


// export function useDB() {
//   return {
//     setItem,
//     getItem,
//     close,
//     getStore,
//   };
// }
