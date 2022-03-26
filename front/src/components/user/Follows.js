import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as Api from "../../api";
import { UserStateContext } from "../../App";
import { Row, Col, Container } from "react-bootstrap";
import UserCard from "./UserCard";

function Follows() {
  const navigate = useNavigate();
  const userState = useContext(UserStateContext);
  const [users, setUsers] = useState([]);
  const [reFetching, setReFetching] = useState(new Date());

  useEffect(() => {
    if (!userState.user) {
      navigate("/login");
      return;
    }

    Api.get("userlist").then((res) => {
      setUsers(res.data);
    });
  }, [userState, navigate, reFetching]);

  const filterFollowUsers = users.filter((user) =>
    userState.user.following.includes(user.id)
  );

  return (
    <Container
      fluid
      style={{ height: "auto", minHeight: "100%", paddingBottom: "250px" }}
    >
      <>
        {filterFollowUsers.length > 0 ? (
          <Row xs="auto">
            {filterFollowUsers.map((user) => (
              <Col sm={2} key={user.id}>
                <UserCard user={user} setReFetching={setReFetching} isFollows />
              </Col>
            ))}
          </Row>
        ) : (
          <>
            <div
              style={{
                display: "block",
                textAlign: "center",
              }}
            >
              <img
                src="/letsFollow.png"
                alt="follow"
                width="500"
                height="500"
                onClick={() => navigate("/network")}
              />
            </div>
            <div
              className="mt-4"
              style={{
                color: "#303B4B",
                display: "block",
                textAlign: "center",
              }}
            >
              <p>이미지를 누르시면 전체 목록으로 이동합니다.</p>
            </div>
          </>
        )}
      </>
    </Container>
  );
}

export default Follows;