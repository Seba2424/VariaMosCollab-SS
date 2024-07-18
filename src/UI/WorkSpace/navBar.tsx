import React, { Component } from "react";
import ProjectService from "../../Application/Project/ProjectService";
import { getUserProfile, logoutUser } from "../SignUp/SignUp.utils";
import SaveDialog from "../SaveDialog/saveDialog";
import OpenDialog from "../OpenDialog/openDialog";
import NewDialog from "../NewDialog/newDialog";
import InviteUserModal from "../InviteUserModal/InviteUserModal";
import QueryModal from "../Queries/queryModal";
import "./NavBar.css";
interface Props {
  projectService: ProjectService;
}
interface State {
  firstName: string;
  show_query_modal: boolean;
  show_save_modal: boolean;
  show_open_modal: boolean;
  show_new_modal: boolean;
  show_invite_modal: boolean;
  isLoggedIn: boolean;
}

class NavBar extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      firstName: "",
      show_query_modal: false,
      show_save_modal: false,
      show_open_modal: false,
      show_new_modal: false,
      show_invite_modal: false,
      isLoggedIn: false,
    };

    this.exportProject = this.exportProject.bind(this);
    this.refreshNavBar = this.refreshNavBar.bind(this);

    // Modal functions binding
    this.handleShowQueryModal = this.handleShowQueryModal.bind(this);
    this.handleCloseQueryModal = this.handleCloseQueryModal.bind(this);
    this.handleShowInviteModal = this.handleShowInviteModal.bind(this);
    this.handleCloseInviteModal = this.handleCloseInviteModal.bind(this);
    this.handleInviteUser = this.handleInviteUser.bind(this);
  }

  componentDidMount() {
    const userProfile = getUserProfile();

    if (userProfile) {
      this.setState({
        firstName: userProfile.givenName,
        isLoggedIn: true,
      });
    }
  }

  saveProject() {
    if (this.props.projectService.isGuessUser()) {
      this.exportProject();
    } else {
      let pf = this.props.projectService.getProjectInformation();
      if (!pf) {
        this.handleShowSaveModal();
      } else if (!pf.id) {
        this.handleShowSaveModal();
      } else {
        this.props.projectService.saveProjectInServer(pf, null, null);
      }
    }
  }

  saveProjectAs() {
    if (this.props.projectService.isGuessUser()) {
      this.exportProject();
    } else {
      this.handleShowSaveModal();
    }
  }

  newProject() {
    this.handleShowNewModal();
  }

  openProject() {
    this.handleShowOpenModal();
  }

  handleShowSaveModal() {
    this.setState({ show_save_modal: true });
  }

  handleCloseSaveModal() {
    this.setState({ show_save_modal: false });
  }

  handleShowOpenModal() {
    this.setState({ show_open_modal: true });
  }

  handleCloseOpenModal() {
    this.setState({ show_open_modal: false });
  }

  handleShowNewModal() {
    this.setState({ show_new_modal: true });
  }

  handleCloseNewModal() {
    this.setState({ show_new_modal: false });
  }

  handleShowInviteModal() {
    this.setState({ show_invite_modal: true });
  }

  handleCloseInviteModal() {
    this.setState({ show_invite_modal: false });
  }

  handleInviteUser(userName: string) {
    alert(`Invitación enviada a ${userName}`);
    this.handleCloseInviteModal();
  }

  exportProject() {
    this.props.projectService.exportProject();
  }

  refreshNavBar() {
    this.forceUpdate();
  }

  handlerLogout() {
    logoutUser();
  }

  handleShowQueryModal() {
    this.setState({ show_query_modal: true });
  }

  handleCloseQueryModal() {
    this.setState({ show_query_modal: false });
  }

  render() {
    return (
      <div className="NavBar">
        <div className="header">
          <a title="New project" onClick={this.newProject.bind(this)}><span><img src="/images/menuIcons/new.png" alt="New project"></img></span></a>{" "}
          <a title="Open project" onClick={this.openProject.bind(this)}><span><img src="/images/menuIcons/open.png" alt="Open project"></img></span></a>{" "}
          <a title="Save project" onClick={this.saveProject.bind(this)}><span><img src="/images/menuIcons/save.png" alt="Save project"></img></span></a>{" "}
          <a title="Save project as ..." onClick={this.saveProjectAs.bind(this)}><span><img src="/images/menuIcons/saveas.png" alt="Save project as"></img></span></a>{" "}
          <a title="Download project" onClick={this.exportProject.bind(this)}><span><img src="/images/menuIcons/download.png" alt="Download project"></img></span></a>{" "}
          <a title="Queries" onClick={() => this.handleShowQueryModal()}><span><img src="/images/menuIcons/queries.png" alt="Queries"></img></span></a>{" "}
          <a title="Settings" onClick={() =>
            document.getElementById("projectManagement").click()
          }><span><img src="/images/menuIcons/settings.png" alt="Settings"></img></span></a>{" "}
          <button
            type="button"
            data-bs-toggle="modal"
            data-bs-target="#staticBackdrop"
            className="nav-bar-variamos"
            id="projectManagement"
            hidden={true}
          >
            Project Management
          </button>
          <button onClick={this.handleShowInviteModal}>
            Invitar a usuarios
          </button>
        </div>
        <div>
          <QueryModal show={this.state.show_query_modal} handleCloseCallback={this.handleCloseQueryModal} projectService={this.props.projectService} />
        </div>
        <div>
          {!this.state.show_save_modal ? (
            null
          ) : (
            <SaveDialog show={this.state.show_save_modal} handleCloseCallback={this.handleCloseSaveModal.bind(this)} projectService={this.props.projectService} />
          )}
        </div>
        <div>
          {!this.state.show_open_modal ? (
            null
          ) : (
            <OpenDialog show={this.state.show_open_modal} handleCloseCallback={this.handleCloseOpenModal.bind(this)} projectService={this.props.projectService} />
          )}
        </div>
        <div>
          {!this.state.show_new_modal ? (
            null
          ) : (
            <NewDialog show={this.state.show_new_modal} handleCloseCallback={this.handleCloseNewModal.bind(this)} projectService={this.props.projectService} />
          )}
        </div>
        <InviteUserModal
          show={this.state.show_invite_modal}
          handleClose={this.handleCloseInviteModal}
          handleInvite={this.handleInviteUser}
        />
      </div>
    );
  }
}

export default NavBar;
