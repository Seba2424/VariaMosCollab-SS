import React, { Component } from "react";
import DiagramEditor from "../DiagramEditor/DiagramEditor";
import ElementsPannel from "../DiagramEditor/ElementsPannel";
import PropiertiesPannel from "../DiagramEditor/PropiertiesPannel";
import ProjectManagement from "../ProjectManagement/ProjectManagement";
import TreeExplorer from "../TreeExplorer/TreeExplorer";
import ProjectService from "../../Application/Project/ProjectService";
import TreeMenu from "../TreeExplorer/TreeMenu";
import { getUserProfile } from "../SignUp/SignUp.utils";
import Layout from "../../core/components/Layout";
import "./DashBoard.css";

interface Props {
  loginEnabled?: boolean;
}
interface State {
  projectData: any;
}

class DashBoard extends Component<Props, State> {
  state: State = {
    projectData: {}
  };

  projectService: ProjectService = new ProjectService();

  constructor(props: Props) {
    super(props);
  }

  componentDidMount() {
    // Conectar a socket.io y establecer los manejadores de eventos
    this.projectService.socket.on('initialData', (data: any) => {
      this.setState({ projectData: data });
    });

    this.projectService.socket.on('update', (data: any) => {
      this.setState(prevState => ({
        projectData: this.projectService.deepMerge(prevState.projectData, data)
      }));
    });

    let project = this.projectService.createProject("My project");
    if (project.productLines.length === 0) {
      this.projectService.createLPS(project, "My product line", "System", "Retail");
    }
    this.projectService.updateProject(project, null);
  }

  render() {
    const userProfile = getUserProfile();

    if (this.props.loginEnabled && !userProfile) {
      window.location.href = "/";
      return null;
    }

    return (
      <Layout>
        <ProjectManagement projectService={this.projectService} />
        {/* <NavBar projectService={this.projectService} /> */}
        <table>
          <tbody>
            <tr>
              <td className="tdTreeExplorer">
                <TreeExplorer projectService={this.projectService} />
              </td>
              <td className="tdDiagramEditor">
                <DiagramEditor projectService={this.projectService} />
              </td>
              <td className="tdElements">
                <ElementsPannel projectService={this.projectService} />
              </td>
            </tr>
          </tbody>
        </table>
      </Layout>
    );
  }
}

export default DashBoard;
