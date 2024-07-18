import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface InviteUserModalProps {
  show: boolean;
  handleClose: () => void;
  handleInvite: (name: string) => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ show, handleClose, handleInvite }) => {
  const [userName, setUserName] = useState('');

  const onInvite = () => {
    handleInvite(userName);
    setUserName('');
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Invitar a Usuario</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="formUserName">
            <Form.Label>Nombre del Usuario</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingresa el nombre del usuario"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onInvite}>
          Invitar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InviteUserModal;
