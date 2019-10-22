import * as React from "react";
import { JSONSchema6 } from "json-schema";
import Form, { IChangeEvent, UiSchema } from "react-jsonschema-form";
import * as jsoncparser from "jsonc-parser";
import { MonacoTextModelService } from "@theia/monaco/lib/browser/monaco-text-model-service";
import { MonacoEditorModel } from "@theia/monaco/lib/browser/monaco-editor-model";
import { DisposableCollection } from "@theia/core";
import { ReferencedModelStorage } from "./referenced-model-storage";

export class JsonschemaFormView extends React.Component<JsonschemaFormView.Props, JsonschemaFormView.State> {

    protected readonly schemaStorage: ReferencedModelStorage<JSONSchema6>;
    protected readonly uiSchemaStorage: ReferencedModelStorage<UiSchema>;

    constructor(props: JsonschemaFormView.Props) {
        super(props);
        this.state = {
            schema: {
                default: {}
            },
            formData: {},
            //initialized property with default object
            uiSchema: {}
        }
        const { model, modelService } = props;
        this.schemaStorage = new ReferencedModelStorage(model, modelService, '$schema', { default: {} });
        this.uiSchemaStorage = new ReferencedModelStorage(model, modelService, '$uiSchema', {});
        //this.uiSchemaStorage = new ReferencedModelStorage(model, modelService, '$uiSchema', { default: {} });

    }

    render(): JSX.Element | null {
        // TODO: track and apply uiSchema to Form



        //   - List to its changes in `componentWillMount` method and udpate `uiSchema` state accordingly.
        //   - Update the storage whenever the form data model is changed in `reconcileFormData` method.
        const { schema, formData, uiSchema } = this.state;
        return <Form
            schema={schema}
            uiSchema={uiSchema}
            formData={formData}
            onChange={this.submit}>
            <div />
        </Form>;
    }

    protected submit = (e: IChangeEvent<any>) => {
        const model = this.props.model.textEditorModel;
        const content = model.getValue();
        const formattingOptions = { tabSize: 2, insertSpaces: true, eol: '' };
        const edits = jsoncparser.modify(content, [], e.formData, { formattingOptions });
        model.applyEdits(edits.map(e => {
            const start = model.getPositionAt(e.offset);
            const end = model.getPositionAt(e.offset + e.length);
            return {
                range: monaco.Range.fromPositions(start, end),
                text: e.content
            }
        }));
    }

    protected readonly toDispose = new DisposableCollection();
    componentWillMount(): void {
        this.toDispose.push(this.schemaStorage);
        this.toDispose.push(this.uiSchemaStorage);
        this.toDispose.push(this.schemaStorage.onDidChange(schema => this.setState({ schema })));
        //PAY ATTENTION HERE.. this.uiSchemaStorage.onDidChange should be updated
        this.toDispose.push(this.uiSchemaStorage.onDidChange(uiSchema => this.setState({ uiSchema })));
        this.reconcileFormData();
        this.toDispose.push(this.props.model.onDidChangeContent(() => this.reconcileFormData()));
    }
    componentWillUnmount(): void {
        this.toDispose.dispose();
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error(error);
    }

    protected async reconcileFormData(): Promise<void> {
        const formData = jsoncparser.parse(jsoncparser.stripComments(this.props.model.getText())) || {};

        this.setState({ formData });
        this.schemaStorage.update(formData);
        this.uiSchemaStorage.update(formData);
    }

}
export namespace JsonschemaFormView {
    export interface Props {
        model: MonacoEditorModel
        modelService: MonacoTextModelService
    }
    export interface State {
        schema: JSONSchema6
        formData: any
        uiSchema: UiSchema
    }
}
