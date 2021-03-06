import React, { useContext } from "react";
import { Col, Row } from "react-bootstrap";
import { EditButton, DeleteButton } from "../../common/Button";
import { OwnerContext } from "../../common/context/Context";

/** 경력 목록 컴포넌트입니다.
 *
 * @param {boolean} setIsEditing - 편집중 상태 변경 state
 * @returns projectList and edit button
 */
function CareerCard({ career, setCareerList, setIsEditing }) {
  const { isEditable } = useContext(OwnerContext);
  const { id, title, description, from_date, to_date } = career.data;

  return (
    <Row className="align-items-center">
      <Col className="mb-3">
        <span>{title}</span>
        <br />
        <span style={{ color: "gray" }}>{description}</span>
        <br />
        <span style={{ color: "gray" }}>
          {from_date} ~ {to_date}
        </span>
      </Col>
      {isEditable && (
        <>
          <Col sm={1}>
            <EditButton setState={setIsEditing} />
          </Col>
          <Col sm={1}>
            <DeleteButton
              endpoint={"careers"}
              id={id}
              setState={setCareerList}
              index={career.index}
            />
          </Col>
        </>
      )}
    </Row>
  );
}

export default CareerCard;
