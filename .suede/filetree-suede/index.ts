import FileComponent from "./File.svelte";
import FolderComponent from "./Folder.svelte";
import RootComponent from "./Root.svelte";
import RootDefaultStyle from "./styles/Default.svelte";
import {
  Root as RootModel,
  File as FileModel,
  Folder as FolderModel,
} from "./models.svelte";

export const File = {
  Component: FileComponent,
  Model: FileModel,
};

export namespace File {
  export type Model = FileModel;
}

export const Folder = {
  Model: FolderModel,
  Component: FolderComponent,
};

export namespace Folder {
  export type Model = FolderModel;
}

export const Root = {
  Model: RootModel,
  RawComponent: RootComponent,
  DefaultStyle: RootDefaultStyle,
};

export namespace Root {
  export type Model = RootModel;
}
