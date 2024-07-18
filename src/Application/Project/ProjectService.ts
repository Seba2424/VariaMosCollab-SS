
import { ProjectInformation } from "../../Domain/ProductLineEngineering/Entities/ProjectInformation";
import { Adaptation } from "../../Domain/ProductLineEngineering/Entities/Adaptation";
import { Application } from "../../Domain/ProductLineEngineering/Entities/Application";
import { Model } from "../../Domain/ProductLineEngineering/Entities/Model";
import { ProductLine } from "../../Domain/ProductLineEngineering/Entities/ProductLine";
import { Project } from "../../Domain/ProductLineEngineering/Entities/Project";
import { Element } from "../../Domain/ProductLineEngineering/Entities/Element";
import { NewModelEventArg } from "./Events/NewModelEventArg";
import ProjectManager, {
  ModelLookupResult,
} from "../../Domain/ProductLineEngineering/UseCases/ProjectUseCases";
import { Language } from "../../Domain/ProductLineEngineering/Entities/Language";
import LanguageUseCases from "../../Domain/ProductLineEngineering/UseCases/LanguageUseCases";
import { SelectedModelEventArg } from "./Events/SelectedModelEventArg";
import { SelectedElementEventArg } from "./Events/SelectedElementEventArg";
import { UpdatedElementEventArg } from "./Events/UpdatedElementEventArg";
import { CreatedElementEventArg } from "./Events/CreatedElementEventArg";
import { LanguagesDetailEventArg } from "./Events/LanguagesDetailEventArg";
import { ProjectEventArg } from "./Events/ProjectEventArg";
import { NewProductLineEventArg } from "./Events/NewProductLineEventArg";
import { NewApplicationEventArg } from "./Events/NewApplicationEventArg";
import { NewAdaptationEventArg } from "./Events/NewAdaptationEventArg";
import { ExternalFuntion } from "../../Domain/ProductLineEngineering/Entities/ExternalFuntion";
import { Utils } from "../../Addons/Library/Utils/Utils";
import { Config } from "../../Config";
import { Relationship } from "../../Domain/ProductLineEngineering/Entities/Relationship";
import { Property } from "../../Domain/ProductLineEngineering/Entities/Property";
import { Point } from "../../Domain/ProductLineEngineering/Entities/Point";
import RestrictionsUseCases from "../../Domain/ProductLineEngineering/UseCases/RestrictionsUseCases";
import ProjectUseCases from "../../Domain/ProductLineEngineering/UseCases/ProjectUseCases";
import ProjectPersistenceUseCases from "../../Domain/ProductLineEngineering/UseCases/ProjectPersistenceUseCases";
import { isJSDocThisTag } from "typescript";
import * as alertify from "alertifyjs";
import { Buffer } from "buffer";
import { ConfigurationInformation } from "../../Domain/ProductLineEngineering/Entities/ConfigurationInformation";

import io, { Socket } from 'socket.io-client';

export default class ProjectService {
  private graph: any;
  private projectManager: ProjectManager = new ProjectManager();
  private languageUseCases: LanguageUseCases = new LanguageUseCases();
  private projectPersistenceUseCases: ProjectPersistenceUseCases = new ProjectPersistenceUseCases();
  private restrictionsUseCases: RestrictionsUseCases =
    new RestrictionsUseCases();

  private utils: Utils = new Utils();

  //Since we have no access to the current language,
  //We will need a parameter query when we need it
  // more and more it's clear we need redux or something like it
  // to manage the state of the application
  private _currentLanguage: Language = null;

  private _environment: string = Config.NODE_ENV;
  private _languages: any = this.getLanguagesByUser();
  private _externalFunctions: ExternalFuntion[] = [];
  private _project: Project = this.createProject("");
  private _projectInformation: ProjectInformation;
  private treeItemSelected: string = "";
  private treeIdItemSelected: string = "";
  private productLineSelected: number = 0;
  private applicationSelected: number = 0;
  private adaptationSelected: number = 0;

  private newProductLineListeners: any = [];
  private newApplicationListeners: any = [];
  private newAdaptationListeners: any = [];
  private newDomainEngineeringModelListeners: any = [];
  private newApplicationEngineeringModelListeners: any = [];
  private newApplicationModelListeners: any = [];
  private newAdaptationModelListeners: any = [];
  private selectedModelListeners: any = [];
  private loadLanguagesListeners: any = [];
  private updateProjectListeners: any = [];
  private updateSelectedListeners: any = [];
  private selectedElementListeners: any = [];
  private updatedElementListeners: any = [];
  private createdElementListeners: any = [];


  public socket: Socket;
  private jsonData: any;

  
  constructor() {
    this.socket = io('http://localhost:3001');
    this.jsonData = {};

    this.socket.on('initialData', (data: any) => {
      this.jsonData = data;
      this.updateLocalData();
    });

    this.socket.on('update', (data: any) => {
      this.jsonData = this.deepMerge(this.jsonData, data);
      this.updateLocalData();
    });
  }

  public updateJsonData(newData: any) {
    this.jsonData = this.deepMerge(this.jsonData, newData);
    this.socket.emit('update', newData);
  }

  private updateLocalData() {
    // Lógica para actualizar el espacio de trabajo con los datos locales
    console.log('Local data updated', this.jsonData);
  }

  public deepMerge(target: any, source: any) {
    // Función para fusionar profundamente dos objetos y arrays
    const isObject = (obj: any) => obj && typeof obj === 'object';

    if (!isObject(target) || !isObject(source)) {
      return source;
    }

    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        target[key] = [...targetValue, ...sourceValue];  // Fusiona arrays en lugar de reemplazar
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        target[key] = this.deepMerge(targetValue, sourceValue);
      } else {
        target[key] = sourceValue;
      }
    });

    return target;
  }

  public get currentLanguage(): Language {
    return this._currentLanguage;
  }

  public get externalFunctions(): ExternalFuntion[] {
    return this._externalFunctions;
  }

  public get environment(): string {
    return this._environment;
  }

  public getProject(): Project {
    return this._project;
  }

  public getProjectInformation(): ProjectInformation {
    return this._projectInformation;
  }

  public setProjectInformation(projectInformation: ProjectInformation) {
    this._projectInformation = projectInformation;
  }

  public getProductLineSelected(): ProductLine {
    let i = this.productLineSelected;
    return this.project.productLines[i];
  }

  callExternalFuntion(
    externalFunction: ExternalFuntion,
    query: any,
    selectedElementsIds: string[],
    selectedRelationshipsIds: string[]
  ) {
    let me = this;

    // Standard Request Start
    externalFunction.request = {};

    //pack the semantics
    const semantics = me._languages.filter(
      (lang) => lang.id === externalFunction.language_id
    )[0].semantics;

    const data = {
      modelSelectedId: me.treeIdItemSelected,
      project: me._project,
      rules: semantics,
      selectedElementsIds: selectedElementsIds,
      selectedRelationshipsIds: selectedRelationshipsIds,
    };

    externalFunction.request = {
      transactionId: me.generateId(),
      data: !query ? data : { ...data, query },
    };
    // Standard Request End

    let callback = function (response: any) {
      //Decode content.
      //alert(JSON.stringify(response));
      if (externalFunction.resulting_action === "download") {
        let buffer = Buffer.from(response.data.content, "base64");
        response.data.content = buffer;
      } else if (response.data.name?.indexOf("json") > -1)
        response.data.content = JSON.parse(response.data.content);

      const resulting_action: any = {
        download: function () {
          me.utils.downloadBinaryFile(
            response.data.name,
            response.data.content
          );
        },
        showonscreen: function () {
          // alert(JSON.stringify(response.data.content));
          if ("error" in response.data) {
            alertify.error(response.data.error);
          } else {
            if (String(response.data.content).includes("(model")) {
              // alertify.alert("Model semantics", `${String(response.data.content)}`)
              alert(`${String(response.data.content)}`);
            } else {
              alertify.success(String(response.data.content));
            }
            // document.getElementById(me.treeIdItemSelected).click();
          }
        },
        updateproject: function () {
          if ("error" in response.data) {
            alertify.error(response.data.error);
          } else {
            me.updateProject(response.data.content, me.treeIdItemSelected);
            // document.getElementById(me.treeIdItemSelected).click();
          }
        },
      };
      //Set the resulting action to be conditional on the query itself
      //since we will have a single mechanism for making these queries
      // TODO: FIXME: This is a dirty hack...
      if (!query) {
        resulting_action[externalFunction.resulting_action]();
      } else {
        if (response.data.content?.productLines) {
          resulting_action["updateproject"]();
        } else {
          resulting_action["showonscreen"]();
        }
      }
    };
    alertify.success("request sent ...");
    me.languageUseCases.callExternalFuntion(callback, externalFunction);
  }

  loadExternalFunctions(languageName: string) {
    let me = this;
    let language = this._languages.filter(
      (language) => language.name == languageName
    );
    let callback = function (data: any) {
      me._externalFunctions = data;
    };
    if (language) {
      if (language.length > 0) {
        this.languageUseCases.getExternalFunctions(callback, language[0].id);
        // HACK: FIXME: This is a dirty hack...
        // We will se the current language to be the first one
        // so that we can get it instead of passing through a million different
        // functions
        this._currentLanguage = language[0];
      }
    }
  }

  //Search Model functions_ START***********
  modelDomainSelected(idPl: number, idDomainModel: number) {
    let modelSelected =
      this._project.productLines[idPl].domainEngineering?.models[idDomainModel];

    this.treeItemSelected = "model";
    this.treeIdItemSelected = modelSelected.id;

    this.loadExternalFunctions(modelSelected.type);

    this.raiseEventSelectedModel(modelSelected);
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }

  modelApplicationEngSelected(idPl: number, idApplicationEngModel: number) {
    let modelSelected =
      this._project.productLines[idPl].applicationEngineering?.models[
      idApplicationEngModel
      ];
    this.treeItemSelected = "model";
    this.treeIdItemSelected = modelSelected.id;

    this.loadExternalFunctions(modelSelected.type);

    this.raiseEventSelectedModel(modelSelected);
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }

  modelApplicationSelected(
    idPl: number,
    idApplication: number,
    idApplicationModel: number
  ) {
    let modelSelected =
      this._project.productLines[idPl].applicationEngineering?.applications[
        idApplication
      ].models[idApplicationModel];
    this.treeItemSelected = "model";
    this.treeIdItemSelected = modelSelected.id;

    this.loadExternalFunctions(modelSelected.type);

    this.raiseEventSelectedModel(modelSelected);
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }

  modelAdaptationSelected(
    idPl: number,
    idApplication: number,
    idAdaptation: number,
    idAdaptationModel: number
  ) {
    let modelSelected =
      this._project.productLines[idPl].applicationEngineering?.applications[
        idApplication
      ].adaptations[idAdaptation].models[idAdaptationModel];

    this.treeItemSelected = "model";
    this.treeIdItemSelected = modelSelected.id;

    this.loadExternalFunctions(modelSelected.type);

    this.raiseEventSelectedModel(modelSelected);
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }

  addSelectedModelListener(listener: any) {
    this.selectedModelListeners.push(listener);
  }

  removeSelectedModelListener(listener: any) {
    this.selectedModelListeners[listener] = null;
  }

  raiseEventSelectedModel(model: Model | undefined) {
    if (model) {
      let me = this;
      let e = new SelectedModelEventArg(me, model);
      for (let index = 0; index < me.selectedModelListeners.length; index++) {
        let callback = this.selectedModelListeners[index];
        callback(e);
      }
    }
  }

  addSelectedElementListener(listener: any) {
    this.selectedElementListeners.push(listener);
  }

  removeSelectedElementListener(listener: any) {
    this.selectedElementListeners[listener] = null;
  }

  raiseEventSelectedElement(
    model: Model | undefined,
    element: Element | undefined
  ) {
    let me = this;
    let e = new SelectedElementEventArg(me, model, element);
    for (let index = 0; index < me.selectedElementListeners.length; index++) {
      let callback = this.selectedElementListeners[index];
      callback(e);
    }
  }

  addUpdatedElementListener(listener: any) {
    this.updatedElementListeners.push(listener);
  }

  removeUpdatedElementListener(listener: any) {
    this.updatedElementListeners[listener] = null;
  }

  raiseEventUpdatedElement(
    model: Model | undefined,
    element: Element | undefined
  ) {
    let me = this;
    let e = new UpdatedElementEventArg(me, model, element);
    for (let index = 0; index < me.updatedElementListeners.length; index++) {
      let callback = this.updatedElementListeners[index];
      callback(e);
    }
  }

  addCreatedElementListener(listener: any) {
    this.createdElementListeners.push(listener);
  }

  removeCreatedElementListener(listener: any) {
    this.createdElementListeners[listener] = null;
  }

  raiseEventCreatedElement(
    model: Model | undefined,
    element: Element | undefined
  ) {
    let me = this;
    let e = new CreatedElementEventArg(me, model, element);
    for (let index = 0; index < me.createdElementListeners.length; index++) {
      let callback = this.createdElementListeners[index];
      callback(e);
    }
  }

  updateAdaptationSelected(
    idPl: number,
    idApplication: number,
    idAdaptation: number
  ) {
    this.productLineSelected = idPl;
    this.applicationSelected = idApplication;
    this.adaptationSelected = idAdaptation;
    this.treeItemSelected = "adaptation";
    this.treeIdItemSelected =
      this._project.productLines[idPl].applicationEngineering.applications[
        idApplication
      ].adaptations[idAdaptation].id;
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }
  updateApplicationSelected(idPl: number, idApplication: number) {
    this.productLineSelected = idPl;
    this.applicationSelected = idApplication;
    this.treeItemSelected = "application";
    this.treeIdItemSelected =
      this._project.productLines[idPl].applicationEngineering.applications[
        idApplication
      ].id;
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }
  updateLpSelected(idPl: number) {
    this.productLineSelected = idPl;
    this.treeItemSelected = "productLine";
    this.treeIdItemSelected = this._project.productLines[idPl].id;
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }

  updateDomainEngSelected() {
    this.treeItemSelected = "domainEngineering";
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }

  updateAppEngSelected() {
    this.treeItemSelected = "applicationEngineering";
    this.raiseEventUpdateSelected(this.treeItemSelected);
  }

  //Function ot get currently selected model
  getTreeIdItemSelected(): string {
    return this.treeIdItemSelected;
  }

  getTreeItemSelected() {
    return this.treeItemSelected;
  }

  setTreeItemSelected(value: string) {
    this.treeItemSelected = value;
  }

  addUpdateSelectedListener(listener: any) {
    this.updateSelectedListeners.push(listener);
  }

  removeUpdateSelectedListener(listener: any) {
    this.updateSelectedListeners[listener] = null;
  }

  raiseEventUpdateSelected(itemSelected: string) {
    let me = this;
    let e: string = itemSelected;
    for (let index = 0; index < me.updateSelectedListeners.length; index++) {
      let callback = this.updateSelectedListeners[index];
      callback(e);
    }
  }
  //Search Model functions_ END***********

  //Language functions_ START***********

  public get languages(): Language[] {
    return this._languages;
  }

  getUser() {
    let userId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    let databaseUserProfile = sessionStorage.getItem("databaseUserProfile");
    if (databaseUserProfile) {
      let data = JSON.parse(databaseUserProfile);
      userId = data.user.id;
    }
    if (userId == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
      //  userId = "21cd2d82-1bbc-43e9-898a-d5a45abdeced";
    }
    return userId;
  }

  isGuessUser() {
    let userId = this.getUser();
    let guessUserId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    if (userId == guessUserId) {
      return true;
    } else {
      return false;
    }
  }

  getLanguagesByUser(): Language[] {
    let user = this.getUser();
    return this.languageUseCases.getLanguagesByUser(user);
  }

  getLanguagesDetail(): Language[] {
    return this.languageUseCases.getLanguagesDetail();
  }

  applyRestrictions(callback: any, model: Model) {
    let languageByName: Language = this.languageUseCases.getLanguageByName(
      model.type,
      this._languages
    );

    let restrictions: any =
      this.restrictionsUseCases.getRestrictions(languageByName);

    this.restrictionsUseCases.applyRestrictions(callback, model, restrictions);
  }

  getLanguagesDetailCll(callback: any) {
    return this.languageUseCases.getLanguagesDetailCll(callback);
  }

  createLanguage(callback: any, language: any) {
    let user = this.getUser();
    if (user) {
      language.abstractSyntax = JSON.parse(language.abstractSyntax);
      language.concreteSyntax = JSON.parse(language.concreteSyntax);
      language.semantics = JSON.parse(language.semantics);
      return this.languageUseCases.createLanguage(callback, language, user);
    }
  }

  updateLanguage(callback: any, language: any, languageId: string) {
    let user = this.getUser();
    if (user) {
      language.id = languageId;
      language.abstractSyntax = JSON.parse(language.abstractSyntax);
      language.concreteSyntax = JSON.parse(language.concreteSyntax);
      language.semantics = JSON.parse(language.semantics);
      return this.languageUseCases.updateLanguage(callback, language, user);
    }
  }

  deleteLanguage(callback: any, languageId: string) {
    let user = this.getUser();
    return this.languageUseCases.deleteLanguage(callback, languageId, user);
  }

  existDomainModel(language: string): boolean {
    let existModel = this._project.productLines[
      this.productLineSelected
    ].domainEngineering.models.filter((model) => model.type === language)[0];

    if (existModel) return true;

    return false;
  }

  existApplicaioninEngModel(language: string): boolean {
    let existModel = this._project.productLines[
      this.productLineSelected
    ].applicationEngineering.models.filter(
      (model) => model.type === language
    )[0];

    if (existModel) return true;

    return false;
  }

  existApplicaioninModel(language: string): boolean {
    let existModel = this._project.productLines[
      this.productLineSelected
    ].applicationEngineering.applications[
      this.applicationSelected
    ].models.filter((model) => model.type === language)[0];

    if (existModel) return true;

    return false;
  }

  existAdaptationModel(language: string): boolean {
    let existModel = this._project.productLines[
      this.productLineSelected
    ].applicationEngineering.applications[this.applicationSelected].adaptations[
      this.adaptationSelected
    ].models.filter((model) => model.type === language)[0];

    if (existModel) return true;

    return false;
  }

  addLanguagesDetailListener(listener: any) {
    this.loadLanguagesListeners.push(listener);
  }

  removeLanguagesDetailListener(listener: any) {
    this.loadLanguagesListeners[listener] = null;
  }

  raiseEventLanguagesDetail(language: Language[]) {
    let me = this;
    let e = new LanguagesDetailEventArg(me, language);
    for (let index = 0; index < me.loadLanguagesListeners.length; index++) {
      let callback = this.loadLanguagesListeners[index];
      callback(e);
    }
  }

  getLanguagesByType(languageType: string, _languages: Language[]): Language[] {
    return this.languageUseCases.getLanguagesByType(languageType, _languages);
  }

  languageExist(languageName: string): Boolean {
    return this.languageUseCases.getLanguageByName(
      languageName,
      this._languages
    )
      ? true
      : false;
  }

  //Language functions_ END***********

  //Project functions_ START***********
  public get project(): Project {
    return this._project;
  }

  public set project(value: Project) {
    this._project = value;
  }

  createNewProject(projectName: string, productLineName: string, type: string, domain: string) {
    let project = this.projectManager.createProject(projectName);
    this.createLPS(project, productLineName, type, domain);
    return project;
  }

  createProject(projectName: string): Project {
    let project = this.projectManager.createProject(projectName);
    project = this.loadProject(project);

    return project;
  }

  //This gets called when one uploads a project file
  //It takes as the parameters the file one selects from the
  //dialog
  importProject(file: string | undefined): void {
    console.log(file);
    if (file) {
      this._project = Object.assign(this._project, JSON.parse(file));
      this._projectInformation = new ProjectInformation(null, this._project.name, null, false, null, null, null, new Date());
    }
    this.raiseEventUpdateProject(this._project, null);
  }

  updateProject(project: Project, modelSelectedId: string): void {
    this._project = project;
    this.raiseEventUpdateProject(this._project, modelSelectedId);
    //find the model selected
    //By default, only a single product line is supported
  }

  loadProject(project: Project): Project {
    let projectSessionStorage = sessionStorage.getItem("Project");
    if (projectSessionStorage) {
      project = Object.assign(project, JSON.parse(projectSessionStorage));
    }

    return project;
  }

  openProjectInServer(projectId: string, template: boolean): void {
    let me = this;
    let user = this.getUser();

    let openProjectInServerSuccessCallback = (projectInformation: ProjectInformation) => {
      me._project = projectInformation.project;
      me._projectInformation = projectInformation;
      if (template) {
        me._projectInformation.id = null;
        me._projectInformation.template = false;
      }
      me.raiseEventUpdateProject(me._project, null);
    }

    let openProjectInServerErrorCallback = (e) => {
      alert(JSON.stringify(e));
    }

    this.projectPersistenceUseCases.openProject(user, projectId, openProjectInServerSuccessCallback, openProjectInServerErrorCallback);
  }

  saveProjectInServer(projectInformation: ProjectInformation, successCallback: any, errorCallback: any): void {
    let me = this;
    let user = this.getUser();
    projectInformation.project = this._project;

    let sc = (e) => {
      me._projectInformation = e;
      if (successCallback) {
        successCallback(e);
      }
    }
    this.projectPersistenceUseCases.saveProject(user, projectInformation, sc, errorCallback);
  }

  deleteProjectInServer(projectInformation: ProjectInformation, successCallback: any, errorCallback: any): void {
    let me = this;
    let user = this.getUser();

    let sc = (e) => {
      me._projectInformation = e;
      if (successCallback) {
        successCallback(e);
      }
    }
    this.projectPersistenceUseCases.deleteProject(user, projectInformation, sc, errorCallback);
  }

  saveConfigurationInServer(configurationInformation: ConfigurationInformation, successCallback: any, errorCallback: any): void {
    let me = this;
    let user = this.getUser();

    let projectInformation = this.getProjectInformation();
    if (!projectInformation) {
      return;
    }

    configurationInformation.id_feature_model = this.treeIdItemSelected;
    configurationInformation.project_json = this._project;

    let sc = (e) => {
      if (successCallback) {
        successCallback(e);
      }
    }
    this.projectPersistenceUseCases.addConfiguration(user, projectInformation, configurationInformation, sc, errorCallback);
  }

  getProjectsByUser(successCallback: any, errorCallback: any) {
    let user = this.getUser();
    this.projectPersistenceUseCases.getProjectsByUser(user, successCallback, errorCallback);
  }

  getTemplateProjects(successCallback: any, errorCallback: any) {
    let user = this.getUser();
    this.projectPersistenceUseCases.getTemplateProjects(user, successCallback, errorCallback);
  }


  getAllConfigurations(successCallback: any, errorCallback: any) {
    let me = this;
    let user = this.getUser();
    let projectInformation = this.getProjectInformation();
    if (!projectInformation) {
      return;
    }
    let configurationInformation = new ConfigurationInformation(null, null, this.treeIdItemSelected, null);
    this.projectPersistenceUseCases.getAllConfigurations(user, projectInformation, configurationInformation, successCallback, errorCallback);
  }

  applyConfigurationInServer(configurationId: string,): void {
    let me = this;
    let user = this.getUser();
    let projectInformation = this.getProjectInformation();
    if (!projectInformation) {
      return;
    }
    let modelId = this.treeIdItemSelected;
    let configurationInformation = new ConfigurationInformation(configurationId, null, modelId, null);

    let successCallback = (project: Project) => {
      let configuredModel: Model = this.findModelById(project, modelId);
      let targetModel: Model = this.findModelById(me._project, modelId);
      targetModel.elements = configuredModel.elements;
      targetModel.relationships = configuredModel.relationships;
      me.raiseEventUpdateProject(this._project, modelId);
    }

    let errorCallback = (e) => {
      alert(JSON.stringify(e));
    }

    this.projectPersistenceUseCases.applyConfiguration(user, projectInformation, configurationInformation, successCallback, errorCallback);
  }

  deleteConfigurationInServer(configurationId: string,): void {
    let me = this;
    let user = this.getUser();
    let projectInformation = this.getProjectInformation();
    if (!projectInformation) {
      return;
    }
    let modelId = this.treeIdItemSelected;
    let configurationInformation = new ConfigurationInformation(configurationId, null, modelId, null);

    let successCallback = (project: Project) => {
      let x=0;
      // let configuredModel: Model = this.findModelById(project, modelId);
      // let targetModel: Model = this.findModelById(me._project, modelId);
      // targetModel.elements = configuredModel.elements;
      // targetModel.relationships = configuredModel.relationships;
      // me.raiseEventUpdateProject(this._project, modelId);
    }

    let errorCallback = (e) => {
      alert(JSON.stringify(e));
    }

    this.projectPersistenceUseCases.deleteConfiguration(user, projectInformation, configurationInformation, successCallback, errorCallback);
  }

  saveProject(): void {
    this.projectManager.saveProject(this._project);
  }

  deleteProject(): void {
    this.projectManager.deleteProject();
    window.location.reload();
  }

  exportProject() {
    this.utils.downloadFile(this._project.name + ".json", this._project);
  }

  deleteItemProject() {
    this._project = this.projectManager.deleteItemProject(
      this._project,
      this.treeIdItemSelected
    );
    this.raiseEventUpdateProject(this._project, null);
  }

  refreshLanguageList() {
    this._languages = this.getLanguagesByUser();
    this.raiseEventLanguagesDetail(this._languages);
  }

  renameItemProject(newName: string) {
    this._project = this.projectManager.renameItemProject(
      this._project,
      this.treeIdItemSelected,
      newName
    );
    this.raiseEventUpdateProject(this._project, this.treeIdItemSelected);
  }

  getItemProjectName() {
    return this.projectManager.getItemProjectName(
      this._project,
      this.treeIdItemSelected
    );
  }

  updateProjectState(state: boolean) {
    this._project.enable = state;
    this.raiseEventUpdateProject(this._project, this.treeIdItemSelected);
  }

  updateProjectName(name: string) {
    this._project.name = name;
    this.raiseEventUpdateProject(this._project, this.treeIdItemSelected);
  }

  addUpdateProjectListener(listener: any) {
    this.updateProjectListeners.push(listener);
  }

  removeUpdateProjectListener(listener: any) {
    this.updateProjectListeners[listener] = null;
  }

  raiseEventUpdateProject(project: Project, modelSelectedId: string) {
    let me = this;
    let e = new ProjectEventArg(me, project, modelSelectedId);
    for (let index = 0; index < me.updateProjectListeners.length; index++) {
      let callback = this.updateProjectListeners[index];
      callback(e);
    }
  }
  //Project functions_ END***********

  //Product Line functions_ START***********
  createLPS(
    project: Project,
    productLineName: string,
    type: string,
    domain: string
  ) {
    return this.projectManager.createLps(
      project,
      productLineName,
      type,
      domain
    );
  }

  addNewProductLineListener(listener: any) {
    this.newProductLineListeners.push(listener);
  }

  removeNewProductLineListener(listener: any) {
    this.newProductLineListeners[listener] = null;
  }

  raiseEventNewProductLine(productLine: ProductLine) {
    let me = this;
    let e = new NewProductLineEventArg(me, me._project, productLine);
    for (let index = 0; index < me.newProductLineListeners.length; index++) {
      let callback = this.newProductLineListeners[index];
      callback(e);
    }
  }
  //Product Line functions_ END***********

  //Application functions_ START***********
  createApplication(project: Project, applicationName: string) {
    return this.projectManager.createApplication(
      project,
      applicationName,
      this.productLineSelected
    );
  }

  addNewApplicationListener(listener: any) {
    this.newApplicationListeners.push(listener);
  }

  removeNewApplicationListener(listener: any) {
    this.newApplicationListeners[listener] = null;
  }

  raiseEventApplication(application: Application) {
    let me = this;
    let e = new NewApplicationEventArg(me, me._project, application);
    for (let index = 0; index < me.newApplicationListeners.length; index++) {
      let callback = this.newApplicationListeners[index];
      callback(e);
    }
  }
  //Application functions_ END***********

  //Adaptation functions_ START***********
  createAdaptation(project: Project, adaptationName: string) {
    return this.projectManager.createAdaptation(
      project,
      adaptationName,
      this.productLineSelected,
      this.applicationSelected
    );
  }

  addNewAdaptationListener(listener: any) {
    this.newAdaptationListeners.push(listener);
  }

  removeNewAdaptationListener(listener: any) {
    this.newAdaptationListeners[listener] = null;
  }

  raiseEventAdaptation(adaptation: Adaptation) {
    let me = this;
    let e = new NewAdaptationEventArg(me, me._project, adaptation);
    for (let index = 0; index < me.newAdaptationListeners.length; index++) {
      let callback = this.newAdaptationListeners[index];
      callback(e);
    }
  }
  //Adaptation functions_ END***********

  //createDomainEngineeringModel functions_ START***********
  createDomainEngineeringModel(
    project: Project,
    languageType: string,
    name: string
  ) {
    return this.projectManager.createDomainEngineeringModel(
      project,
      languageType,
      this.productLineSelected,
      name
    );
  }

  addNewDomainEngineeringModelListener(listener: any) {
    this.newDomainEngineeringModelListeners.push(listener);
  }

  removeNewDomainEngineeringModelListener(listener: any) {
    this.newDomainEngineeringModelListeners[listener] = null;
  }

  raiseEventDomainEngineeringModel(model: Model) {
    let me = this;
    let e = new NewModelEventArg(me, me._project, model);
    for (
      let index = 0;
      index < me.newDomainEngineeringModelListeners.length;
      index++
    ) {
      let callback = this.newDomainEngineeringModelListeners[index];
      callback(e);
    }
  }
  //createDomainEngineeringModel functions_ END***********

  //createApplicationEngineeringModel functions_ START***********
  createApplicationEngineeringModel(
    project: Project,
    languageType: string,
    name: string
  ) {
    return this.projectManager.createApplicationEngineeringModel(
      project,
      languageType,
      this.productLineSelected,
      name
    );
  }

  addNewApplicationEngineeringModelListener(listener: any) {
    this.newApplicationEngineeringModelListeners.push(listener);
  }

  removeNewApplicationEngineeringModelListener(listener: any) {
    this.newApplicationEngineeringModelListeners[listener] = null;
  }

  raiseEventApplicationEngineeringModel(model: Model) {
    let me = this;
    let e = new NewModelEventArg(me, me._project, model);
    for (
      let index = 0;
      index < me.newApplicationEngineeringModelListeners.length;
      index++
    ) {
      let callback = this.newApplicationEngineeringModelListeners[index];
      callback(e);
    }
  }
  //createApplicationEngineeringModel functions_ END***********

  //createApplicationModel functions_ START***********
  createApplicationModel(project: Project, languageType: string, name: string) {
    return this.projectManager.createApplicationModel(
      project,
      languageType,
      this.productLineSelected,
      this.applicationSelected,
      name
    );
  }

  addNewApplicationModelListener(listener: any) {
    this.newApplicationModelListeners.push(listener);
  }

  removeNewApplicationModelListener(listener: any) {
    this.newApplicationModelListeners[listener] = null;
  }

  raiseEventApplicationModelModel(model: Model) {
    let me = this;
    let e = new NewModelEventArg(me, me._project, model);
    for (
      let index = 0;
      index < me.newApplicationModelListeners.length;
      index++
    ) {
      let callback = this.newApplicationModelListeners[index];
      callback(e);
    }
  }
  //createApplicationModel functions_ END***********

  //createAdaptationModel functions_ START***********
  createAdaptationModel(project: Project, languageType: string, name: string) {
    return this.projectManager.createAdaptationModel(
      project,
      languageType,
      this.productLineSelected,
      this.applicationSelected,
      this.adaptationSelected,
      name
    );
  }

  addNewAdaptationModelListener(listener: any) {
    this.newAdaptationModelListeners.push(listener);
  }

  removeNewAdaptationModelListener(listener: any) {
    this.newAdaptationModelListeners[listener] = null;
  }

  raiseEventAdaptationModelModel(model: Model) {
    let me = this;
    let e = new NewModelEventArg(me, me._project, model);
    for (
      let index = 0;
      index < me.newAdaptationModelListeners.length;
      index++
    ) {
      let callback = this.newAdaptationModelListeners[index];
      callback(e);
    }
  }
  //createAdaptationModel functions_ END***********

  //createApplicationEngineeringModel functions_ START***********

  //createApplicationEngineeringModel functions_ END***********

  setGraph(graph: any) {
    this.graph = graph;
  }

  getGraph() {
    return this.graph;
  }

  open() {
    //open file
  }

  duplicateObject(obj: any) {
    let str = JSON.stringify(obj);
    return JSON.parse(str);
  }

  getStyleDefinition(language: string, callBack: any) {
    if (this.languages) {
      for (let index = 0; index < this.languages.length; index++) {
        if (this.languages[index].name === language) {
          callBack(this.languages[index]);
        }
      }
    }
  }

  getLanguageDefinition(language: string) {
    if (this.languages) {
      for (let index = 0; index < this.languages.length; index++) {
        if (this.languages[index].name === language) {
          return this.languages[index];
        }
      }
    }
  }

  // getLanguagesByType(language: string) {
  //   if (this.languages) {
  //     for (let index = 0; index < this.languages.length; index++) {
  //       if (this.languages[index].name === language) {
  //         return this.languages[index];
  //       }
  //     }
  //   }
  // }

  createRelationship(
    model: Model,
    name: string,
    type: string,
    sourceId: string,
    targetId: string,
    points: Point[] = [],
    min: number,
    max: number,
    properties: Property[]
  ): Relationship {
    let r = this.projectManager.createRelationship(
      model,
      name,
      type,
      sourceId,
      targetId,
      points,
      min,
      max,
      properties
    );
    return r;
  }

  findModelById(project: Project, uid: any) {
    return ProjectUseCases.findModelById(project, uid);
  }

  findModelElementById(model: Model, uid: any) {
    return ProjectUseCases.findModelElementById(model, uid);
  }

  findModelElementByName(model: Model, name: any) {
    return ProjectUseCases.findModelElementByName(model, name);
  }

  findModelRelationshipById(model: Model, uid: any) {
    return ProjectUseCases.findModelRelationshipById(model, uid);
  }

  removeModelElementById(model: Model, uid: any) {
    return ProjectUseCases.removeModelElementById(model, uid);
  }

  removeModelRelationshipById(model: Model, uid: any) {
    return ProjectUseCases.removeModelRelationshipById(model, uid);
  }

  removeModelRelationshipsOfElement(model: Model, uid: any) {
    return ProjectUseCases.removeModelRelationshipsOfElement(model, uid);
  }

  findModelByName(type: string, modelName: string, neightborModel: Model) {
    return ProjectUseCases.findModelByName(
      this._project,
      type,
      modelName,
      neightborModel.id
    );
  }

  findModelElementByIdInProject(elementId: string) {
    return ProjectUseCases.findModelElementByIdInProject(
      this._project,
      elementId
    );
  }

  findModelElementPropertyByIdInProject(propertyId: string) {
    return ProjectUseCases.findModelElementPropertyByIdInProject(
      this._project,
      propertyId
    );
  }

  generateId() {
    return ProjectUseCases.generateId();
  }

  visualizeModel() { }

  //This function updates the selection status of the model
  //elements based on an incoming configuration under the form
  //of a project.
  //It is used when we call the translator from the UI
  updateSelection(projectInResponse: Project, modelSelectedId: string) {
    const modelLookupResult = this.projectManager.updateSelection(
      this._project,
      projectInResponse,
      modelSelectedId
    );
    this.reSelectModel(modelLookupResult);
  }

  //Reset the selection on the currently selected model
  resetModelConfig() {
    const modelLookupResult = this.projectManager.findModel(
      this._project,
      this.getTreeIdItemSelected()
    );
    if (modelLookupResult) {
      this.projectManager.resetSelection(modelLookupResult);
      // We should have the enum available here
      this.reSelectModel(modelLookupResult);
    }
  }

  lookupAndReselectModel() {
    const modelLookupResult = this.projectManager.findModel(
      this._project,
      this.getTreeIdItemSelected()
    );
    if (modelLookupResult) {
      this.reSelectModel(modelLookupResult);
    }
  }

  reSelectModel(modelLookupResult: ModelLookupResult) {
    switch (modelLookupResult.modelType) {
      case "Domain":
        this.modelDomainSelected(
          modelLookupResult.plIdx,
          modelLookupResult.modelIdx
        );
        break;
      case "Application":
        this.modelApplicationSelected(
          modelLookupResult.plIdx,
          modelLookupResult.appIdx,
          modelLookupResult.modelIdx
        );
        break;
      case "Adaptation":
        this.modelAdaptationSelected(
          modelLookupResult.plIdx,
          modelLookupResult.appIdx,
          modelLookupResult.adapIdx,
          modelLookupResult.modelIdx
        );
        break;
      case "ApplicationEng":
        this.modelApplicationEngSelected(
          modelLookupResult.plIdx,
          modelLookupResult.modelIdx
        );
        break;
      default:
        console.error("Unknown model type: " + modelLookupResult.modelType);
        console.error("could not reset model config");
        break;
    }
  }

  getProductLineDomainsList() {
    let list = [
      "Advertising and Marketing",
      "Agriculture",
      "Architecture and Design",
      "Art and Culture",
      "Automotive",
      "Beauty and Wellness",
      "Childcare and Parenting",
      "Construction",
      "Consulting and Professional Services",
      "E-commerce",
      "Education",
      "Energy and Utilities",
      "Environmental Services",
      "Event Planning and Management",
      "Fashion and Apparel",
      "Finance and Banking",
      "Food and Beverage",
      "Gaming and Gambling",
      "Government and Public Sector",
      "Healthcare",
      "Hospitality and Tourism",
      "Insurance",
      "Legal Services",
      "Manufacturing",
      "Media and Entertainment",
      "Non-profit and Social Services",
      "Pharmaceuticals",
      "Photography and Videography",
      "Printing and Publishing",
      "Real Estate",
      "Research and Development",
      "Retail",
      "Security and Surveillance",
      "Software and Web Development",
      "Sports and Recreation",
      "Telecommunications",
      "Transportation and Logistics",
      "Travel and Leisure",
      "Wholesale and Distribution",
      "IoT",
      "IndustrialControlSystems",
      "HealthCare",
      "Communication",
      "Military",
      "WebServices",
      "Transportation",
      "SmartPhones",
      "PublicAdministration",
      "Multi-Domain",
      "Banking",
      "EmergencyServices",
      "Cloud-Provider",
    ];
    return list;
  }

  getProductLineTypesList() {
    let list = ["Software", "System"];
    return list;
  }

  generateName(model: Model, type: string) {
    for (let i = 1; i < 100000000; i++) {
      let name = type + " " + i;
      let element = this.findModelElementByName(model, name);
      if (!element) {
        return name;
      }
    }
    return this.generateId();
  }
}
