// @flow

import { transform } from "babel-core";
import babelPluginHyperHTML from "./plugin";

function example(name: string, input: string) {
  it(name, () => {
    const { code } = transform(input, {
      babelrc: false,
      plugins: [babelPluginHyperHTML],
      presets: ["stage-2", "react"]
    });
    expect(code).toMatchSnapshot();
  });
}

describe("plugin", () => {
  example(
    "Basic Component",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <span>Hello {name}</span>
    `
  );
  example(
    "Nested Component",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <h1><span>Hello {name}</span></h1>
    `
  );

  example(
    "Nested Component with attributes",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <h1 class="yo"><span>Hello {name}</span></h1>
    `
  );
  example(
    "Custom Components",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <Icon name="+1" />
    `
  );
  example(
    "Components with multiple children",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <h1 class="yo"><span>Hello {name}</span><Icon name="+1" /></h1>
    `
  );
  example(
    "Custom Components with a single child",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <Foo><Bar /></Foo>
    `
  );
  example(
    "Custom Components with multiple children",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <Foo><Bar /><Baz /></Foo>
    `
  );
  example(
    "Custom Components with mixed children",
    `
      import hyperHTML from "hyperhtml";
      const Greet = ({name}) => <Foo><span>Foo</span> Baz <Icon name="ok" /></Foo>
    `
  );

  example(
    "Multiple components",
    `
      import hyperHTML from "hyperhtml";
    const Greeter = ({name}) => <div class="greeter">
      <h1>Hello {name}!</h1>
    </div>;

    const WelcomePage = ({user}) => <article class="welcome-page">
      <Greeter name={user.name} />
    </article>
    `
  );
  example(
    "Import specifier",
    `
      import {wire} from "hyperhtml";
      const Greet = ({name}) => <span>Hello {name}</span>
    `
  );
  example(
    "Import namespace specifier",
    `
      import * as h from "hyperhtml";
      const Greet = ({name}) => <span>Hello {name}</span>
    `
  );
  example(
    "Array Pattern as first argument",
    `
      import * as h from "hyperhtml";
      const Greet = ([name]) => <span>Hello {name}</span>
    `
  );

  example(
    "Normal var as first argument",
    `
      import * as h from "hyperhtml";
      const Greet = (props) => <span>Hello {props.name}</span>
    `
  );

  example(
    "HyperComponent",
    `
    import {Component} from "hyperhtml";
    
    class Demo extends Component {
      constructor(props) {
        this.props = props;
      }

      render() {
        return <div>
          <h1>Hello {this.props.name}</h1>
        </div>
      }
    }
  `
  );

  example(
    "HyperComponent with imported namespace",
    `
    import * as H from "hyperhtml";
    
    class Demo extends H.Component {
      constructor(props) {
        this.props = props;
      }

      render() {
        return <div>
          <h1>Hello {this.props.name}</h1>
        </div>
      }
    }
  `
  );

  example(
    "Non hyper class",
    `
    import * as H from "hyperhtml";
    
    class Demo extends H.Component {
      constructor(props) {
        this.props = props;
      }

      render() {
        return <div>
          <h1>Hello {this.props.name}</h1>
        </div>
      }
    }

    class Demo2 {
      render() {
        return <div />
      }
    }
  `
  );

  example(
    "MemberExpression in JSX",
    `
    import {wire, Component} from 'hyperhtml';

    const Demo = (props) => <A.B>Test {"Testing"} Tester</A.B>;
  `
  );

  example(
    "Convert builtin props",
    `
      import {wire, Component} from 'hyperhtml';

      const Demo = () => <span class="hello" visible tabindex={-1} />;
    `
  );

  example(
    "Builtin component with object rest",
    `
      import {wire, Component} from 'hyperhtml';

      const Demo = ({name, ...extra}) => <div {...extra}><h1>Hi {name}</h1></div>
    `
  );

  example(
    "Custom component with object rest",
    `
      import {wire, Component} from 'hyperhtml';

      const Demo = ({name, ...extra}) => <Jumbotron {...extra}><h1>Hi {name}</h1></Jumbotron>
    `
  );

  example(
    "Custom component with boolean property",
    `
      import {wire} from 'hyperhtml';

      const Demo = () => <Jumbotron big />
    `
  );

  example(
    "Convert block statement",
    `
      import {wire} from 'hyperhtml';
      const Demo = ({name}) => {
        const foo = true;
        return <div>Hello {foo ? name : name.toUpperCase()}</div>
      }
    `
  );

  example(
    "Ignore file with no imports",
    `
    import React from 'react';
    const Demo = ({name}) => <div>{name}</div>;
  `
  );
});
