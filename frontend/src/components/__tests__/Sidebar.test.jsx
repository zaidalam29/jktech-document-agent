// src/components/__tests__/Sidebar.test.jsx
const { render, screen, fireEvent } = require("@testing-library/react");
const React = require("react");
const Sidebar = require("../Sidebar").default;
const authApi = require("../../api/auth");

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  MemoryRouter: ({ children }) => React.createElement("div", null, children),
  useNavigate: () => jest.fn(),
  Link: ({ children, to }) => React.createElement("a", { href: to }, children),
  NavLink: ({ children, to }) => React.createElement("a", { href: to }, children),
}));

// Mock authApi
jest.mock("../../api/auth", () => ({
  logout: jest.fn(),
}));

const { MemoryRouter } = require("react-router-dom");

describe("Sidebar Component", () => {
  test("renders sidebar header", () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/books"] },
        React.createElement(Sidebar)
      )
    );
    expect(screen.getByText(/Book Manager Pro/i)).toBeInTheDocument();
  });

  test("logout button works", () => {
    render(
      React.createElement(MemoryRouter, null,
        React.createElement(Sidebar)
      )
    );
    
    const logoutBtn = screen.getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutBtn);
    
    expect(authApi.logout).toHaveBeenCalled();
  });
});